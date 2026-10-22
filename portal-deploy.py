#!/usr/bin/env python3
"""SINJEON static deployment gate. Standard library only; never calls business APIs."""
import argparse
import concurrent.futures
import hashlib
from html.parser import HTMLParser
import json
import os
from pathlib import Path, PurePosixPath
import re
import sys
import subprocess
import tempfile
import urllib.error
import urllib.parse
import urllib.request

DOMAIN = 'partner.sinjeoncanada.com'
REPOSITORY = 'eunbeenlee/y2c-advisory-portal'
PACKAGE = 'com.sinjeoncanada.partnerportal'
CERT = '95:3B:60:84:2D:00:90:E8:11:96:89:4B:53:26:B0:63:68:64:C5:89:83:47:CF:57:DA:41:DE:B9:BD:DE:94:04'
DAL = '.well-known/assetlinks.json'


def require(ok, message):
    if not ok:
        raise ValueError(message)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def safe_path(name):
    require(isinstance(name, str) and name and not any(c in name for c in '\\%?#\r\n'), 'Invalid file path')
    p = PurePosixPath(name)
    require(not p.is_absolute() and str(p) == name and '..' not in p.parts, 'Unsafe file path: ' + name)
    allowed = (name in [DAL, 'sw.js', 'assets/fonts/PretendardVariable.woff2', 'assets/fonts/OFL.txt'] or
               bool(re.fullmatch(r'[A-Za-z0-9_-]+\.(html|png|json)', name)) or
               bool(re.fullmatch(r'assets/(js|css|icons)/[A-Za-z0-9_.-]+\.(js|css|png)', name)) or
               bool(re.fullmatch(r'apps/SinjeonPortal-[A-Za-z0-9_.-]+\.apk', name)))
    require(allowed, 'Not a public portal asset: ' + name)
    return p


def read_file(root, name):
    path = root
    for part in PurePosixPath(name).parts:
        path = path / part
        require(not path.is_symlink(), 'Symlinks are not published: ' + name)
    require(path.is_file(), 'Missing file: ' + name)
    return path.read_bytes()


def association(data):
    entries = json.loads(data)
    expected = [{'relation': ['delegate_permission/common.handle_all_urls'], 'target': {
        'namespace': 'android_app', 'package_name': PACKAGE, 'sha256_cert_fingerprints': [CERT]}}]
    require(entries == expected, 'Android package / signing certificate / relation mismatch')


def load_manifest(data):
    m = json.loads(data)
    require(isinstance(m, dict) and re.fullmatch(r'V[0-9_]+', m.get('version', '')),
            'Invalid release version')
    entries = m.get('files')
    require(isinstance(entries, list) and 1 <= len(entries) <= 150, 'Invalid file inventory')
    seen = set()
    for entry in entries:
        require(isinstance(entry, dict), 'Invalid file entry')
        name = str(safe_path(entry.get('path')))
        require(name not in seen, 'Duplicate file: ' + name)
        seen.add(name)
        require(re.fullmatch(r'[a-f0-9]{64}', entry.get('sha256', '')), 'Invalid SHA-256: ' + name)
        require(type(entry.get('bytes')) is int and 0 < entry['bytes'] < 100_000_000, 'Invalid size: ' + name)
    require({'index.html', 'sw.js', 'app-health.html', DAL} <= seen, 'Incomplete release inventory')
    require(any(n.startswith('apps/') for n in seen), 'APK missing from inventory')
    return m


class PageReferences(HTMLParser):
    """Parse static references and executable inline scripts without running pages."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.references = []
        self.inline = []
        self.script = None
        self.has_base = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'base':
            self.has_base = True
        for key in ('src', 'href', 'poster'):
            if attrs.get(key):
                self.references.append(attrs[key])
        if tag == 'script':
            kind = attrs.get('type', '').strip().lower()
            executable = not kind or kind in ('text/javascript', 'application/javascript', 'module')
            self.script = {'kind': kind, 'body': ''} if executable and not attrs.get('src') else None

    def handle_data(self, data):
        if self.script is not None:
            self.script['body'] += data

    def handle_endtag(self, tag):
        if tag == 'script' and self.script is not None:
            self.inline.append(self.script)
            self.script = None


def validate_release(files, manifest):
    """Ensure a self-consistent release, rather than only hashing selected files."""
    inventory = {entry['path']: entry for entry in manifest['files']}
    sw = files['sw.js'].decode('utf-8')
    version = re.search(r'const CACHE_VERSION = "([^"]+)";', sw)
    marker = re.search(r'const RELEASE_DIGEST = "([a-f0-9]{16})";', sw)
    block = re.search(r'const RELEASE_HASHES = (\{[\s\S]*?\});', sw)
    require(version and version[1] == manifest['version'], 'Worker / manifest version mismatch')
    require(marker and marker[1] == manifest.get('digest'), 'Worker / manifest digest mismatch')
    require(block, 'Worker release inventory missing')
    hashes = json.loads(block[1])
    require(isinstance(hashes, dict) and hashes, 'Invalid worker release inventory')
    computed = digest(json.dumps(hashes, sort_keys=True, separators=(',', ':')).encode())[:16]
    require(computed == marker[1], 'Worker digest does not match its inventory')
    # app-health stays network-only so a broken offline cache cannot hide diagnostics.
    expected = {name: entry['sha256'] for name, entry in inventory.items()
                if name not in ('sw.js', 'app-health.html') and not name.startswith('apps/') and name != DAL}
    require(hashes == expected, 'Worker / release asset inventory mismatch')

    checked = 0

    def reference(source, target):
        nonlocal checked
        if not target or target.startswith('#'):
            return
        url = urllib.parse.urlsplit(urllib.parse.urljoin('https://' + DOMAIN + '/' + source, target))
        if url.scheme not in ('http', 'https') or url.netloc != DOMAIN:
            return  # External dependencies are not fetched or certified here.
        name = urllib.parse.unquote(url.path).lstrip('/') or 'index.html'
        require(name in inventory, 'Referenced asset not in release: ' + source + ' -> ' + name)
        require(name in files, 'Referenced asset not staged: ' + name)
        checked += 1

    for name in inventory:
        if name.endswith('.html'):
            parser = PageReferences()
            parser.feed(files[name].decode('utf-8'))
            require(not parser.has_base, 'Unexpected base URL in portal page: ' + name)
            for target in parser.references:
                reference(name, target)
        elif name.endswith('.css'):
            css = re.sub(r'/\*[\s\S]*?\*/', '', files[name].decode('utf-8'))
            for match in re.finditer(r'url\(\s*([\'"]?)(.*?)\1\s*\)', css, re.I):
                reference(name, match[2].strip())

    require('manifest.json' in files, 'Web app manifest missing')
    app = json.loads(files['manifest.json'])
    reference('manifest.json', app.get('start_url', 'index.html'))
    for icon in app.get('icons', []):
        reference('manifest.json', icon.get('src'))
    for shortcut in app.get('shortcuts', []):
        reference('manifest.json', shortcut.get('url'))
        for icon in shortcut.get('icons', []):
            reference('manifest.json', icon.get('src'))
    for name in inventory:
        if name.endswith(('.html', '.js', '.json')):
            require(not re.search(r'TEST_FOUNDATION|StagingGuard|AKfycbx1i1TeOyfTjL1EocPL2060JY5Y58bEv57dGCnAAM0npX2px5_wtH5DPGFvdx1G6fA1', files[name].decode('utf-8')),
                    'TEST code cannot be published to the production portal: ' + name)
    # A signed inventory alone is insufficient: install/fetch must use that same complete shell.
    # Keep this literal-list contract explicit so future worker changes must update the gate too.
    core = re.search(r'const CORE_ASSETS = (\[[\s\S]*?\])\.map\(', sw)
    require(core, 'Worker core asset list missing')
    body = core[1][1:-1]
    token = r'''(['"])(/[^'"\r\n]*)\1'''
    paths = [match[2] for match in re.finditer(token, body)]
    require(re.fullmatch(r'[\s,]*', re.sub(token, '', body)) is not None,
            'Worker core asset list must contain only literal paths')
    require(len(paths) == len(set(paths)), 'Duplicate worker core asset')
    require(set(paths) == {'/'} | {'/' + name for name in hashes},
            'Worker core / signed asset inventory mismatch')
    return checked


def check_syntax(root):
    """Node.js is required only for this explicit, read-only syntax command."""
    files, prepared = prepare(root)
    checked = 0
    for name, data in files.items():
        programs = []
        if name.endswith('.js'):
            programs.append({'kind': '', 'body': data.decode('utf-8')})
        elif name.endswith('.html'):
            page = PageReferences()
            page.feed(data.decode('utf-8'))
            programs = page.inline
        for program in programs:
            if not program['body'].strip():
                continue
            command = ['node', '--check']
            if program['kind'] == 'module':
                command.append('--input-type=module')
            result = subprocess.run(command + ['-'], input=program['body'], text=True, capture_output=True)
            require(result.returncode == 0, 'JavaScript syntax error: ' + name + '\n' + result.stderr)
            checked += 1
    return {'result': 'SYNTAX_VERIFIED', 'release': prepared['release'], 'programsChecked': checked,
            'businessDataTouched': False}


def prepare(root):
    root = Path(root).resolve()
    manifest_data = read_file(root, 'release-manifest.json')
    m = load_manifest(manifest_data)
    require(read_file(root, 'CNAME').decode().strip() == DOMAIN, 'Wrong site / CNAME')
    mirror = read_file(root, 'ASSETLINKS_COPY.json')
    association(mirror)
    files = {}
    generated = False
    normalized = False
    for entry in m['files']:
        name = entry['path']
        if name == DAL and not (root / name).exists() and not (root / name).is_symlink():
            data = mirror
            generated = True
        else:
            data = read_file(root, name)
        if name == DAL:
            association(data)
            # Normalize formatting only when both copies assert the exact pinned identity.
            # The visible copy must still match the reviewed release's byte hash below.
            normalized = data != mirror
            data = mirror
        require(len(data) == entry['bytes'] and digest(data) == entry['sha256'], 'Release mismatch: ' + name)
        files[name] = data
    association(files[DAL])
    require(json.loads(files[DAL]) == json.loads(mirror), 'Conflicting Android association files')
    reference_count = validate_release(files, m)
    # Retain existing public APK links and former standalone page scripts.
    # These compatibility assets are recorded separately from the verified release.
    compatibility = []
    for pattern in ['apps/SinjeonPortal-*.apk', 'assets/js/*.js']:
        for path in sorted(root.glob(pattern)):
            name = path.relative_to(root).as_posix()
            safe_path(name)
            if name not in files:
                data = read_file(root, name)
                files[name] = data
                compatibility.append({'path': name, 'sha256': digest(data), 'bytes': len(data)})
    files.update({'release-manifest.json': manifest_data, 'ASSETLINKS_COPY.json': mirror,
                  'CNAME': (DOMAIN + '\n').encode(), '.nojekyll': b'# Publish static files, including .well-known.\n'})
    report = {'release': m['version'], 'verifiedFiles': len(m['files']), 'stagedFiles': len(files),
              'associationGeneratedFromVerifiedCopy': generated, 'compatibilityAssets': compatibility,
              'associationFormattingNormalized': normalized,
              'staticReferencesChecked': reference_count, 'workerInventoryVerified': True,
              'result': 'READY_TO_STAGE', 'businessDataTouched': False}
    return files, report


def stage(root, destination):
    files, report = prepare(root)
    out = Path(destination).absolute()
    require(not out.exists() and not out.is_symlink(), 'Output already exists; choose a new staging directory')
    out.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=out.parent, prefix='.portal-stage-') as temp:
        for name, data in files.items():
            path = Path(temp, name)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
        # Rename only after every file has been written; source files are never modified.
        os.rename(temp, out)
    return report


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def get_bytes(url):
    opener = urllib.request.build_opener(NoRedirect)
    request = urllib.request.Request(url, headers={'Cache-Control': 'no-cache', 'User-Agent': 'SINJEON-Release-Check/1.0'})
    with opener.open(request, timeout=20) as response:
        require(response.status == 200, 'HTTP ' + str(response.status))
        data = response.read(100_000_001)
        require(len(data) <= 100_000_000, 'Response too large')
        return data, response.headers.get_content_type()


def verify(root, base='https://' + DOMAIN, fetch=get_bytes):
    # Expected hashes come from the locally reviewed release, never the server's own assertions.
    files, prepared = prepare(root)
    url = urllib.parse.urlsplit(base)
    require(url.scheme == 'https' and url.hostname == DOMAIN and url.path in ['', '/'] and
            not url.query and not url.fragment and not url.username and not url.password and
            url.port in [None, 443], 'Only the existing HTTPS portal origin is allowed')
    checks = {name: data for name, data in files.items() if name not in ['CNAME', '.nojekyll']}
    checks[''] = files['index.html']

    def check(item):
        name, expected = item
        result = {'path': name or '/', 'ok': False}
        try:
            data, mime = fetch(base.rstrip('/') + '/' + name + '?y2c_diagnostic=1')
            require(digest(data) == digest(expected), 'RELEASE_MISMATCH')
            if name == DAL:
                require(mime == 'application/json', 'Android association must have application/json MIME type')
                association(data)
            result['ok'] = True
        except urllib.error.HTTPError as e:
            result['error'] = 'HTTP ' + str(e.code)
        except Exception as e:
            result['error'] = str(e)
        return result

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(check, checks.items()))
    failed = sum(not x['ok'] for x in results)
    return {'release': prepared['release'], 'result': 'LIVE_VERIFIED' if not failed else 'LIVE_CHECK_FAILED',
            'checkedFiles': len(results), 'failed': failed, 'files': results, 'businessDataTouched': False}


def github_site():
    require(os.environ.get('GITHUB_REPOSITORY') == REPOSITORY, 'This workflow belongs to ' + REPOSITORY)
    token = os.environ.get('GH_TOKEN', '')
    require(bool(token), 'GitHub workflow token unavailable')
    req = urllib.request.Request('https://api.github.com/repos/' + REPOSITORY + '/pages',
                                 headers={'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json'})
    with urllib.request.urlopen(req, timeout=20) as response:
        settings = json.load(response)
    require(settings.get('cname') == DOMAIN and settings.get('build_type') == 'workflow',
            'Settings > Pages must use GitHub Actions and the existing partner.sinjeoncanada.com domain')
    return {'result': 'GITHUB_SITE_CONFIRMED', 'repository': REPOSITORY, 'domain': DOMAIN}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['check', 'stage', 'verify', 'github-site', 'check-syntax'])
    parser.add_argument('--source', default='.')
    parser.add_argument('--output', default='_portal_site')
    parser.add_argument('--report')
    args = parser.parse_args()
    try:
        if args.command == 'github-site':
            result = github_site()
        elif args.command == 'check-syntax':
            result = check_syntax(args.source)
        elif args.command == 'stage':
            result = stage(args.source, args.output)
        elif args.command == 'verify':
            result = verify(args.source)
        else:
            result = prepare(args.source)[1]
        if args.report:
            Path(args.report).write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 1 if result.get('failed', 0) else 0
    except Exception as error:
        print('DEPLOYMENT BLOCKED: ' + str(error), file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
