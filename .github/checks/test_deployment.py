import concurrent.futures
import http.server
import hashlib
import re
import importlib.util
import json
import os
from pathlib import Path
import shutil
import tarfile
import tempfile
import threading
import unittest
import urllib.error
import urllib.parse

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(os.environ.get('PORTAL_SOURCE', str(ROOT.parent / 'app-unified/web/frontend')))
TOOL = Path(os.environ.get('PORTAL_DEPLOY_TOOL', str(ROOT / 'automation/portal-deploy.py')))
if not TOOL.exists():
    TOOL = ROOT / 'kit/automation/portal-deploy.py'
FIXTURE = Path(os.environ.get('PORTAL_DEPLOY_FIXTURE', str(ROOT / 'repo-assetlinks.json')))
if not FIXTURE.exists():
    FIXTURE = ROOT / 'verification/repo-assetlinks.json'
spec = importlib.util.spec_from_file_location('deploy', TOOL)
deploy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deploy)


class DeploymentGate(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.work = Path(self.temp.name)
        self.source = self.work / 'source'
        shutil.copytree(SOURCE, self.source)

    def tearDown(self):
        self.temp.cleanup()

    def edit_manifest(self, transform):
        p = self.source / 'release-manifest.json'
        value = json.loads(p.read_text())
        transform(value)
        p.write_text(json.dumps(value))

    def test_valid_release_and_compatibility_assets_preserved(self):
        files, report = deploy.prepare(self.source)
        self.assertEqual(report['verifiedFiles'], 54)
        self.assertIn('apps/SinjeonPortal-1.0.5.apk', files)
        self.assertIn('assets/js/items.js', files)
        self.assertFalse(report['businessDataTouched'])

    def test_missing_hidden_files_rebuilt_without_source_mutation(self):
        (self.source / deploy.DAL).unlink()
        (self.source / '.nojekyll').unlink()
        out = self.work / 'staged'
        report = deploy.stage(self.source, out)
        self.assertTrue(report['associationGeneratedFromVerifiedCopy'])
        self.assertFalse((self.source / '.nojekyll').exists())
        self.assertFalse((self.source / deploy.DAL).exists())
        self.assertEqual((out / deploy.DAL).read_bytes(), (SOURCE / deploy.DAL).read_bytes())
        self.assertTrue((out / '.nojekyll').is_file())

    def test_actual_repository_json_format_normalized(self):
        p = self.source / deploy.DAL
        p.write_bytes(FIXTURE.read_bytes())
        before = p.read_bytes()
        files, report = deploy.prepare(self.source)
        self.assertTrue(report['associationFormattingNormalized'])
        self.assertEqual(files[deploy.DAL], (SOURCE / deploy.DAL).read_bytes())
        self.assertEqual(p.read_bytes(), before)

    def test_conflicting_identity_not_silently_replaced(self):
        p = self.source / deploy.DAL
        p.write_text(p.read_text().replace(deploy.PACKAGE, 'other.package'))
        with self.assertRaisesRegex(ValueError, 'mismatch'):
            deploy.prepare(self.source)

    def test_wrong_signing_certificate_rejected(self):
        p = self.source / 'ASSETLINKS_COPY.json'
        p.write_text(p.read_text().replace(deploy.CERT, '00:' * 31 + '00'))
        with self.assertRaisesRegex(ValueError, 'certificate'):
            deploy.prepare(self.source)

    def test_release_mix_blocks_before_writing_output(self):
        (self.source / 'assets/js/auth.js').write_text('old release')
        out = self.work / 'staged'
        with self.assertRaisesRegex(ValueError, 'Release mismatch'):
            deploy.stage(self.source, out)
        self.assertFalse(out.exists())

    def test_missing_application_file_blocks(self):
        (self.source / 'items.html').unlink()
        with self.assertRaisesRegex(ValueError, 'Missing file'):
            deploy.prepare(self.source)

    def test_wrong_domain_blocks(self):
        (self.source / 'CNAME').write_text('sinjeoncanada.com')
        with self.assertRaisesRegex(ValueError, 'Wrong site'):
            deploy.prepare(self.source)

    def test_private_files_excluded(self):
        for n in ['.env', 'database.xlsx', 'signing-password.txt', 'private.p12']:
            (self.source / n).write_text('SENTINEL_PRIVATE')
        files, _ = deploy.prepare(self.source)
        self.assertFalse(any(b'SENTINEL_PRIVATE' in value for value in files.values()))

    def test_traversal_in_inventory_rejected(self):
        self.edit_manifest(lambda m: m['files'][0].update(path='../private.json'))
        with self.assertRaisesRegex(ValueError, 'Unsafe file'):
            deploy.prepare(self.source)

    def test_duplicate_inventory_rejected(self):
        self.edit_manifest(lambda m: m['files'].append(m['files'][0]))
        with self.assertRaisesRegex(ValueError, 'Duplicate'):
            deploy.prepare(self.source)

    def test_missing_required_inventory_entry_rejected(self):
        self.edit_manifest(lambda m: m.update(files=[x for x in m['files'] if x['path'] != deploy.DAL]))
        with self.assertRaisesRegex(ValueError, 'Incomplete'):
            deploy.prepare(self.source)

    def test_symlink_in_ancestor_rejected(self):
        shutil.move(self.source / 'assets', self.work / 'outside')
        (self.source / 'assets').symlink_to(self.work / 'outside', target_is_directory=True)
        with self.assertRaisesRegex(ValueError, 'Symlinks'):
            deploy.prepare(self.source)

    def test_existing_output_is_not_overwritten(self):
        out = self.work / 'existing'
        out.mkdir()
        (out / 'keep.txt').write_text('keep')
        with self.assertRaisesRegex(ValueError, 'already exists'):
            deploy.stage(self.source, out)
        self.assertEqual((out / 'keep.txt').read_text(), 'keep')

    def test_staged_tar_contains_hidden_files(self):
        out = self.work / 'staged'
        deploy.stage(self.source, out)
        archive = self.work / 'site.tar'
        with tarfile.open(archive, 'w') as tar:
            tar.add(out, arcname='.')
        with tarfile.open(archive) as tar:
            self.assertEqual(tar.extractfile('./' + deploy.DAL).read(), (SOURCE / deploy.DAL).read_bytes())
            self.assertIsNotNone(tar.getmember('./.nojekyll'))
            self.assertFalse(any(x.issym() or x.islnk() for x in tar.getmembers()))


    def reseal(self):
        """Simulate a hash-updated but semantically broken proposed release."""
        path = self.source / 'release-manifest.json'
        m = json.loads(path.read_text())
        hashes = {e['path']: hashlib.sha256((self.source/e['path']).read_bytes()).hexdigest()
                  for e in m['files'] if e['path'] not in ['sw.js', 'app-health.html', deploy.DAL] and not e['path'].startswith('apps/')}
        fingerprint = hashlib.sha256(json.dumps(hashes, sort_keys=True, separators=(',', ':')).encode()).hexdigest()[:16]
        worker = self.source / 'sw.js'
        text = worker.read_text()
        text = re.sub(r'const RELEASE_HASHES = \{[\s\S]*?\};', 'const RELEASE_HASHES = ' + json.dumps(hashes) + ';', text, count=1)
        text = re.sub(r'const RELEASE_DIGEST = .*?;', 'const RELEASE_DIGEST = "' + fingerprint + '";', text, count=1)
        worker.write_text(text)
        m['digest'] = fingerprint
        for entry in m['files']:
            data = (self.source/entry['path']).read_bytes()
            entry.update(bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
        path.write_text(json.dumps(m))

    def stamp_worker_only(self):
        data = (self.source / 'sw.js').read_bytes()
        self.edit_manifest(lambda m: next(e for e in m['files'] if e['path']=='sw.js').update(bytes=len(data), sha256=hashlib.sha256(data).hexdigest()))

    def test_referenced_css_cannot_be_omitted_from_inventory(self):
        name = 'assets/css/order-lifecycle.css'
        (self.source/name).unlink()
        self.edit_manifest(lambda m: m.update(files=[e for e in m['files'] if e['path']!=name]))
        self.reseal()
        with self.assertRaisesRegex(ValueError, 'Referenced asset not in release'):
            deploy.stage(self.source, self.work/'out')
        self.assertFalse((self.work/'out').exists())

    def test_required_script_cannot_hide_in_compatibility_assets(self):
        self.edit_manifest(lambda m: m.update(files=[e for e in m['files'] if e['path']!='assets/js/auth.js']))
        self.reseal()
        with self.assertRaisesRegex(ValueError, 'Referenced asset not in release'):
            deploy.prepare(self.source)

    def test_worker_version_must_match_manifest(self):
        p = self.source/'sw.js'; p.write_text(re.sub(r'const CACHE_VERSION = .*?;', 'const CACHE_VERSION = "V1_0";', p.read_text(), count=1))
        self.stamp_worker_only()
        with self.assertRaisesRegex(ValueError, 'version mismatch'): deploy.prepare(self.source)

    def test_missing_precache_theme_blocks_even_when_hashes_are_valid(self):
        p = self.source/'sw.js'
        p.write_text(p.read_text().replace("'/assets/css/workspace-ui.css',", '', 1))
        self.stamp_worker_only()
        with self.assertRaisesRegex(ValueError, 'core / signed asset inventory mismatch'):
            deploy.stage(self.source, self.work/'out')
        self.assertFalse((self.work/'out').exists())

    def test_unsigned_precache_asset_blocks(self):
        p = self.source/'sw.js'
        p.write_text(p.read_text().replace('const CORE_ASSETS = [', "const CORE_ASSETS = ['/app-health.html',", 1))
        self.stamp_worker_only()
        with self.assertRaisesRegex(ValueError, 'core / signed asset inventory mismatch'):
            deploy.prepare(self.source)

    def test_duplicate_precache_asset_blocks(self):
        p = self.source/'sw.js'
        p.write_text(p.read_text().replace('const CORE_ASSETS = [', "const CORE_ASSETS = ['/index.html',", 1))
        self.stamp_worker_only()
        with self.assertRaisesRegex(ValueError, 'Duplicate worker core asset'):
            deploy.prepare(self.source)

    def test_root_offline_entry_cannot_be_omitted(self):
        p = self.source/'sw.js'
        p.write_text(p.read_text().replace("    '/',", '', 1))
        self.stamp_worker_only()
        with self.assertRaisesRegex(ValueError, 'core / signed asset inventory mismatch'):
            deploy.prepare(self.source)

    def test_worker_and_manifest_digest_must_match(self):
        self.edit_manifest(lambda m: m.update(digest='0'*16))
        with self.assertRaisesRegex(ValueError, 'digest mismatch'): deploy.prepare(self.source)

    def test_digest_must_represent_actual_worker_inventory(self):
        p = self.source/'sw.js'; p.write_text(re.sub(r'const RELEASE_DIGEST = .*?;', 'const RELEASE_DIGEST = "'+'0'*16+'";', p.read_text(), count=1))
        self.stamp_worker_only(); self.edit_manifest(lambda m: m.update(digest='0'*16))
        with self.assertRaisesRegex(ValueError, 'does not match its inventory'): deploy.prepare(self.source)

    def test_rehashed_worker_with_wrong_asset_hash_is_rejected(self):
        p = self.source/'sw.js'; text=p.read_text(); hashes=json.loads(re.search(r'const RELEASE_HASHES = (\{[\s\S]*?\});', text)[1]);hashes['index.html']='0'*64
        fingerprint=hashlib.sha256(json.dumps(hashes,sort_keys=True,separators=(',',':')).encode()).hexdigest()[:16]
        text=re.sub(r'const RELEASE_HASHES = \{[\s\S]*?\};','const RELEASE_HASHES = '+json.dumps(hashes)+';',text,count=1)
        text=re.sub(r'const RELEASE_DIGEST = .*?;','const RELEASE_DIGEST = "'+fingerprint+'";',text,count=1)
        p.write_text(text);self.stamp_worker_only();self.edit_manifest(lambda m:m.update(digest=fingerprint))
        with self.assertRaisesRegex(ValueError, 'asset inventory mismatch'):deploy.prepare(self.source)

    def test_local_navigation_target_must_be_published(self):
        p=self.source/'index.html';p.write_text(p.read_text()+'<a href="missing-page.html">Missing</a>');self.reseal()
        with self.assertRaisesRegex(ValueError, 'Referenced asset not in release'):deploy.prepare(self.source)

    def test_css_relative_asset_must_be_published(self):
        p=self.source/'assets/css/order-lifecycle.css';p.write_text(p.read_text()+'.example{background:url(../icons/missing.png)}');self.reseal()
        with self.assertRaisesRegex(ValueError, 'Referenced asset not in release'):deploy.prepare(self.source)

    def test_pwa_start_page_must_be_published(self):
        p=self.source/'manifest.json';m=json.loads(p.read_text());m['start_url']='missing.html';p.write_text(json.dumps(m));self.reseal()
        with self.assertRaisesRegex(ValueError, 'Referenced asset not in release'):deploy.prepare(self.source)

    def test_pwa_icon_must_be_published(self):
        p=self.source/'manifest.json';m=json.loads(p.read_text());m['icons'][0]['src']='assets/icons/missing.png';p.write_text(json.dumps(m));self.reseal()
        with self.assertRaisesRegex(ValueError, 'Referenced asset not in release'):deploy.prepare(self.source)

    def test_pwa_shortcut_must_be_published(self):
        p=self.source/'manifest.json';m=json.loads(p.read_text());m['shortcuts'][0]['url']='missing.html';p.write_text(json.dumps(m));self.reseal()
        with self.assertRaisesRegex(ValueError, 'Referenced asset not in release'):deploy.prepare(self.source)

    def test_test_environment_cannot_be_published(self):
        p=self.source/'assets/js/config.js';p.write_text(p.read_text()+'\n// TEST_FOUNDATION must not reach production\n');self.reseal()
        with self.assertRaisesRegex(ValueError, 'TEST code'):deploy.prepare(self.source)

    def test_queries_anchors_and_external_references_are_supported(self):
        p=self.source/'index.html';p.write_text(p.read_text()+'<a href="/items.html?v=1#order">Items</a><a href="https://example.invalid/not-fetched">External</a>');self.reseal()
        files,report=deploy.prepare(self.source);self.assertGreater(report['staticReferencesChecked'],0);self.assertTrue(report['workerInventoryVerified'])

    def test_inline_javascript_syntax_error_blocks_release(self):
        p=self.source/'index.html';p.write_text(p.read_text()+'<script>const broken = ;</script>');self.reseal()
        with self.assertRaisesRegex(ValueError, 'JavaScript syntax error: index.html'):deploy.check_syntax(self.source)

    def test_json_scripts_are_not_js_and_module_syntax_is_checked(self):
        p=self.source/'index.html';p.write_text(p.read_text()+'<script type="application/ld+json">{"item":"ok"}</script><script type="module">export const value=1;</script>');self.reseal()
        result=deploy.check_syntax(self.source);self.assertEqual(result['result'],'SYNTAX_VERIFIED');self.assertGreater(result['programsChecked'],30)

    def test_legacy_apk_is_preserved_without_changing_install_page(self):
        old=self.source/'apps/SinjeonPortal-1.0.0.apk';old.write_bytes(b'OLD_COMPATIBILITY_APK_FIXTURE')
        before=(self.source/'install.html').read_bytes();files,report=deploy.prepare(self.source)
        self.assertEqual(files['apps/SinjeonPortal-1.0.0.apk'],old.read_bytes());self.assertEqual(files['install.html'],before)
        self.assertIn('apps/SinjeonPortal-1.0.0.apk',[e['path'] for e in report['compatibilityAssets']])

    def fake_server(self, mode):
        files, _ = deploy.prepare(self.source)
        def fetch(url):
            name = urllib.parse.urlsplit(url).path.lstrip('/') or 'index.html'
            if name == deploy.DAL:
                if mode == '404':
                    raise urllib.error.HTTPError(url, 404, 'Not Found', {}, None)
                if mode == 'html':
                    return b'<!doctype html>login page', 'text/html'
                if mode == 'mime':
                    return files[name], 'text/html'
            data = files[name]
            if mode == 'mixed' and name == 'index.html':
                data = b'old release'
            return data, 'application/json' if name.endswith('.json') else 'text/html'
        return fetch

    def test_live_match(self):
        report = deploy.verify(self.source, fetch=self.fake_server('good'))
        self.assertEqual(report['failed'], 0)
        self.assertEqual(report['result'], 'LIVE_VERIFIED')

    def test_live_404_detected(self):
        report = deploy.verify(self.source, fetch=self.fake_server('404'))
        self.assertEqual(report['failed'], 1)
        self.assertEqual(next(x['error'] for x in report['files'] if not x['ok']), 'HTTP 404')

    def test_http_200_error_page_is_not_success(self):
        report = deploy.verify(self.source, fetch=self.fake_server('html'))
        self.assertEqual(report['failed'], 1)

    def test_wrong_json_mime_detected(self):
        report = deploy.verify(self.source, fetch=self.fake_server('mime'))
        self.assertEqual(report['failed'], 1)

    def test_server_manifest_cannot_excuse_old_files(self):
        report = deploy.verify(self.source, fetch=self.fake_server('mixed'))
        self.assertGreaterEqual(report['failed'], 1)

    def test_alternate_origin_cannot_be_verified(self):
        with self.assertRaisesRegex(ValueError, 'existing HTTPS'):
            deploy.verify(self.source, base='https://another.example')

    def test_redirect_not_followed_over_real_http(self):
        requested = []
        class Handler(http.server.BaseHTTPRequestHandler):
            def do_GET(self):
                requested.append(self.path)
                self.send_response(302)
                self.send_header('Location', '/login')
                self.end_headers()
            def log_message(self, *args):
                pass
        server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            with self.assertRaises(urllib.error.HTTPError) as context:
                deploy.get_bytes('http://127.0.0.1:' + str(server.server_port) + '/assetlinks.json')
            self.assertEqual(context.exception.code, 302)
            self.assertEqual(requested, ['/assetlinks.json'])
        finally:
            server.shutdown()
            server.server_close()


if __name__ == '__main__':
    unittest.main(verbosity=2)
