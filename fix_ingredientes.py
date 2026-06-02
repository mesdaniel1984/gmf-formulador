with open('gmf_formulador_wizard.html') as f:
    h = f.read()

fixes = [
    ('{n:"Soro",ref:"Da vaca",src:"Usuário",kcal:392.0,cho:85.0,act:85.0,acad:0.0,ptn:13.0,gt:0.0,gs:0.0,tr:0.0,fi:0.0,na:450.0}',
     '{n:"Soro",ref:"Da vaca",src:"Usuário",kcal:392.0,cho:85.0,act:85.0,acad:0.0,ptn:13.0,gt:0.0,gs:0.0,tr:0.0,fi:0.0,na:450.0,rotulo:"soro de leite em pó"}'),
    ('{n:"Permeado",ref:"Sooro",src:"Usuário",kcal:374.0,cho:91.0,act:89.0,acad:0.0,ptn:2.27,gt:0.16,gs:0.1,tr:0.0,fi:0.0,na:447.0}',
     '{n:"Permeado",ref:"Sooro",src:"Usuário",kcal:374.0,cho:91.0,act:89.0,acad:0.0,ptn:2.27,gt:0.16,gs:0.1,tr:0.0,fi:0.0,na:447.0,rotulo:"permeado de soro de leite em pó"}'),
    ('{n:"CMC 2604A",ref:"Denver",src:"Usuário",kcal:0.0,cho:0.0,act:0.0,acad:0.0,ptn:0.0,gt:0.0,gs:0.0,tr:0.0,fi:3.0,na:8.0}',
     '{n:"CMC 2604A",ref:"Denver",src:"Usuário",kcal:0.0,cho:0.0,act:0.0,acad:0.0,ptn:0.0,gt:0.0,gs:0.0,tr:0.0,fi:3.0,na:8.0,rotulo:"estabilizante carboximetilcelulose"}'),
    ('{n:"Açúcar Cristal moída",ref:"Da Cana",src:"Usuário",kcal:400.0,cho:100.0,act:100.0,acad:0.0,ptn:0.0,gt:0.0,gs:0.0,tr:0.0,fi:0.0,na:0.0}',
     '{n:"Açúcar Cristal moída",ref:"Da Cana",src:"Usuário",kcal:400.0,cho:100.0,act:100.0,acad:0.0,ptn:0.0,gt:0.0,gs:0.0,tr:0.0,fi:0.0,na:0.0,rotulo:"açúcar"}'),
    ('{n:"Maltodextrina (Manimalto 20)",ref:"Indemil",src:"Usuário",kcal:385.0,cho:96.0,act:6.0,acad:0.0,ptn:0.0,gt:0.0,gs:0.0,tr:0.0,fi:0.0,na:30.0}',
     '{n:"Maltodextrina (Manimalto 20)",ref:"Indemil",src:"Usuário",kcal:385.0,cho:96.0,act:6.0,acad:0.0,ptn:0.0,gt:0.0,gs:0.0,tr:0.0,fi:0.0,na:30.0,rotulo:"maltodextrina"}'),
    ('{n:"Cacau em pó alcalino gold",ref:"Fralia",src:"Usuário",kcal:438.0,cho:58.0,act:1.8,acad:0.0,ptn:20.0,gt:14.0,gs:8.1,tr:0.0,fi:37.0,na:21.0}',
     '{n:"Cacau em pó alcalino gold",ref:"Fralia",src:"Usuário",kcal:438.0,cho:58.0,act:1.8,acad:0.0,ptn:20.0,gt:14.0,gs:8.1,tr:0.0,fi:37.0,na:21.0,rotulo:"cacau em pó alcalino"}'),
    ('{n:"Cacau em pó alcalino solúvel 100%",ref:"Fralia",src:"Usuário",kcal:438.0,cho:58.0,act:1.8,acad:0.0,ptn:20.0,gt:14.0,gs:8.1,tr:0.0,fi:37.0,na:21.0}',
     '{n:"Cacau em pó alcalino solúvel 100%",ref:"Fralia",src:"Usuário",kcal:438.0,cho:58.0,act:1.8,acad:0.0,ptn:20.0,gt:14.0,gs:8.1,tr:0.0,fi:37.0,na:21.0,rotulo:"cacau em pó alcalino solúvel"}'),
]

for old, new in fixes:
    if old in h:
        h = h.replace(old, new)
        print('OK:', old[:40])
    else:
        print('ERRO:', old[:40])

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)
