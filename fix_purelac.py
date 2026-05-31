with open('gmf_formulador_wizard.html') as f:
    h = f.read()

old = '{n:"Purelac Pro Mix — Mistura Láctea p/ Sorvetes (FT 2018)",ref:"Tangará Foods (SIF 148/1608)",src:"FT",kcal:497,cho:60,act:45,acad:0,ptn:5,gt:26,gs:20.7,tr:0,fi:0,na:367}'

new = '{n:"Purelac Pro Mix — Mistura Láctea p/ Sorvetes (FT 2018)",ref:"Tangará Foods (SIF 148/1608)",src:"FT",kcal:497,cho:60,act:45,acad:0,ptn:5,gt:26,gs:20.7,tr:0,fi:0,na:367,rotulo:"Composto lácteo com Gordura vegetal",rotuloCompleto:"Composto lácteo com Gordura vegetal (Soro de leite e/ou soro de leite em pó reconstituído, leite fluido integral e/ou leite integral em pó reconstituído, gordura vegetal de palma, xarope de glicose, maltodextrina, açúcar, emulsificante mono e diglicerídeos de ácidos graxos (INS 471), estabilizantes (fosfato trissódico (INS 339iii) e fosfato dissódico (INS 339ii)) e aromatizante idêntico ao natural de leite.)"}'

if old in h:
    h = h.replace(old, new)
    print('OK')
else:
    print('ERRO')

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)
