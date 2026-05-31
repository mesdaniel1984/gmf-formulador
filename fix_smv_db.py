with open('gmf_formulador_wizard.html') as f:
    h = f.read()

old = '{n:"Dióxido de Titânio Anatase (INS 171)",ref:"Daxia (ET-489-REV-04)",src:"FT",kcal:0.0,cho:0.0,act:0.0,acad:0.0,ptn:0.0,gt:0.0,gs:0.0,tr:0.0,fi:0.0,na:0.0},'

new = '{n:"Dióxido de Titânio Anatase (INS 171)",ref:"Daxia (ET-489-REV-04)",src:"FT",kcal:0.0,cho:0.0,act:0.0,acad:0.0,ptn:0.0,gt:0.0,gs:0.0,tr:0.0,fi:0.0,na:0.0},\n{n:"Premix de Nutrientes SMV8150 (Sweetmix)",ref:"Sweetmix (RGT 110.009 rev.01)",src:"FT",kcal:0,cho:0,act:0,acad:0,ptn:0,gt:0,gs:0,tr:0,fi:0,na:0,rotulo:"mix de vitaminas e minerais",rotuloCompleto:"mix de vitaminas e minerais (Vitamina A, Vitamina B1, Vitamina B2, Vitamina B3, Vitamina B5, Vitamina B6, Vitamina H, Vitamina B12, Vitamina C, Vitamina D3, Vitamina E, Ferro, Zinco e Fosfato Tricálcico)"},'

if old in h:
    h = h.replace(old, new)
    print('OK')
else:
    print('ERRO')

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)
