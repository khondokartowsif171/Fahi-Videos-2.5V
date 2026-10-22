"""Run over existing SSH. Receives existing Gitea login on stdin; never logs it."""
import json, os, pathlib, secrets, subprocess, sys, urllib.parse

ROOT=pathlib.Path('/opt/fahi-studio-preview')
ROOT.mkdir(mode=0o700,exist_ok=True)
def run(args,**kw):
    return subprocess.run(args,check=True,text=True,**kw)
def output(args):
    return subprocess.check_output(args,text=True).strip()
auth=json.load(sys.stdin)
ask=ROOT/'askpass.sh'
ask.write_text('#!/bin/sh\ncase "$1" in *Username*) printf "%s" "$GITEA_USERNAME";; *) printf "%s" "$GITEA_PASSWORD";; esac\n')
ask.chmod(0o700)
env=dict(os.environ,GIT_ASKPASS=str(ask),GIT_TERMINAL_PROMPT='0',GITEA_USERNAME=auth['login'],GITEA_PASSWORD=auth['password'])
repo=ROOT/'source'
if not repo.exists(): run(['git','clone','--branch','main','https://git.auraajenticai.cloud/khondokar/fahi-videos.git',str(repo)],env=env)
else:
    run(['git','-C',str(repo),'fetch','origin','main'],env=env)
    if output(['git','-C',str(repo),'status','--porcelain']): raise RuntimeError('Deployment source has local changes; refusing overwrite.')
    run(['git','-C',str(repo),'merge','--ff-only','origin/main'])
ask.unlink()
private=ROOT/'studio.env'
if not private.exists():
    sources=output(['docker','ps','--filter','name=rdqk1mqe0k8fifs64d7jrzfi-','--format','{{.Names}}']).splitlines()
    if len(sources)!=1: raise RuntimeError('Expected exactly one running Client Dashboard container.')
    client_env=dict(item.split('=',1) for item in json.loads(output(['docker','inspect',sources[0],'--format','{{json .Config.Env}}'])))
    bridge=secrets.token_hex(32);vault=secrets.token_hex(32);password=secrets.token_urlsafe(40)
    pg='ernix50nvuq9ur9jy8na8tgr'
    def psql(db,query): return output(['docker','exec',pg,'psql','-U','postgres','-d',db,'-v','ON_ERROR_STOP=1','-Atc',query])
    if psql('postgres',"SELECT count(*) FROM pg_roles WHERE rolname='aura_fahi_runtime'")!='0': raise RuntimeError('Studio role exists but environment is missing; manual reconciliation required.')
    psql('postgres',"CREATE ROLE aura_fahi_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '"+password+"'")
    psql('postgres','CREATE DATABASE aura_fahi_studio OWNER postgres')
    run(['docker','exec','-i',pg,'psql','-U','postgres','-d','aura_fahi_studio','-v','ON_ERROR_STOP=1'],input=(repo/'ops/studio-schema.sql').read_text(),stdout=subprocess.DEVNULL)
    psql('aura_fahi_studio','REVOKE CREATE ON SCHEMA public FROM PUBLIC; GRANT CONNECT ON DATABASE aura_fahi_studio TO aura_fahi_runtime; GRANT USAGE ON SCHEMA public TO aura_fahi_runtime; GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO aura_fahi_runtime;')
    url='postgresql://aura_fahi_runtime:'+urllib.parse.quote(password,safe='')+'@'+pg+':5432/aura_fahi_studio'
    private.write_text('FAHI_EMBEDDED=1\nFAHI_BRIDGE_SECRET='+bridge+'\nSTUDIO_VAULT_KEY='+vault+'\nSTUDIO_DATABASE_URL='+url+'\nSTUDIO_MEDIA_DIR=/media\n')
    private.chmod(0o600)
    gateway={key:client_env[key] for key in ['DATABASE_URL','JWT_SECRET','TENANT','SELF_URL'] if key in client_env}
    gateway.update(FAHI_PREVIEW_ENABLED='1',FAHI_RELEASE_MODE='preview',FAHI_INTERNAL_URL='http://aura-fahi-studio:3000',FAHI_BRIDGE_SECRET=bridge)
    (ROOT/'gateway.env').write_text('\n'.join(k+'='+v for k,v in gateway.items())+'\n')
    (ROOT/'gateway.env').chmod(0o600)
media=ROOT/'media';media.mkdir(exist_ok=True);os.chown(media,1000,1000)
revision=output(['git','-C',str(repo),'rev-parse','HEAD'])
(ROOT/'release.env').write_text('FAHI_REVISION='+revision+'\n')
print(json.dumps({'source':str(repo),'revision':revision,'database':'aura_fahi_studio','credentials':'private server environment only'}))
