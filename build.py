import re
h=open('index.html').read()
h=h.replace('<link rel="stylesheet" href="styles.css">','<style>\n'+open('styles.css').read()+'\n</style>')
def rep(m):
    return '<script>\n'+open(m.group(1)).read().replace('</script','<\\/script')+'\n</script>'
h=re.sub(r'<script src="([a-z]+\.js)"></script>',rep,h)
open('/mnt/user-data/outputs/quoteflow.html','w').write(h)
print(len(h))
