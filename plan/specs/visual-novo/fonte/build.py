import json,base64,glob,os,re,sys
G=os.path.join(os.path.dirname(os.path.abspath(__file__)),'../../../../apps/web/public/assets/graphics/')
tex={}
for th in ['Grass','Ice','Metal']:
  tex[th]={}
  for f in sorted(glob.glob(G+th+'/*.png')):
    n=re.sub(r'\.[0-9a-f]{10}\.png$','',os.path.basename(f))
    if n.startswith('floor_') or n.startswith('wall_'):
      tex[th][n]='data:image/png;base64,'+base64.b64encode(open(f,'rb').read()).decode()
s=open(sys.argv[1]).read()
s=s.replace('"__TEX__"',json.dumps(tex)).replace('"__MAPS__"',open(sys.argv[2]).read())
open(sys.argv[3],'w').write(s); print(len(s))
