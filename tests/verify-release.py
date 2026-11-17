#!/usr/bin/env python3
"""One-command local release verification. Never deploys or calls a business API.
Run from any directory: python tests/verify-release.py
Optional: --output /tmp/sinjeon-verification (must be outside the source tree).
Browser/source rendering tests are separate and explicitly not claimed here.
"""
from pathlib import Path
import argparse, json, os, subprocess, sys, tempfile, time

ROOT = Path(__file__).resolve().parents[1]

def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--output');args=ap.parse_args()
    output=Path(args.output).resolve() if args.output else Path(tempfile.mkdtemp(prefix='sinjeon-qa-'))
    if output==ROOT or ROOT in output.parents:ap.error('Output must be outside the source tree to avoid recursive fixture copies.')
    output.mkdir(parents=True,exist_ok=True)
    env={**os.environ,'PORTAL_SOURCE':str(ROOT),'PORTAL_DEPLOY_TOOL':str(ROOT/'portal-deploy.py'),'PORTAL_DEPLOY_FIXTURE':str(ROOT/'.github/checks/repo-assetlinks.json')}
    node_tests=['tests/invoice-regression.js']+[str(p.relative_to(ROOT)) for p in sorted((ROOT/'tests').glob('*.test.js'))]
    steps=[
        ('release-inventory',[sys.executable,'portal-deploy.py','check','--source','.']),
        ('javascript-syntax',[sys.executable,'portal-deploy.py','check-syntax','--source','.']),
        ('functional-regressions',['node','--test',*node_tests]),
        ('deployment-regressions',[sys.executable,'.github/checks/test_deployment.py']),
        ('staged-release',[sys.executable,'portal-deploy.py','stage','--source','.','--output',str(output/'staged'),'--report',str(output/'preflight.json')]),
    ]
    results=[]
    for label,cmd in steps:
        print('CHECK '+label,flush=True);started=time.monotonic()
        result=subprocess.run(cmd,cwd=ROOT,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
        (output/(label+'.log')).write_text(result.stdout,encoding='utf-8')
        results.append({'name':label,'passed':result.returncode==0,'seconds':round(time.monotonic()-started,3)})
        if result.returncode:
            print(result.stdout);print('FAILED. No deployment was performed. Logs:',output);return result.returncode
    manifest=json.loads((ROOT/'release-manifest.json').read_text())
    report={'result':'PASS','version':manifest['version'],'steps':results,'businessDataTouched':False,'deployed':False,'browserSuiteIncluded':False,'logs':str(output)}
    (output/'verification-summary.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2));return 0

if __name__=='__main__':sys.exit(main())
