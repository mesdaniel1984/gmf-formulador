'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
 for(const width of [320,1280]){
 const page=await browser.newPage({viewport:{width,height:900}});
 await page.setContent('<main class="i2-workspace">Formulador</main><section id="step6"><div><header>Ingredientes</header><form id="cadastro">Cadastro</form><article><div id="ing_lista"><table><tr><th>Nome</th></tr><tr><td>Café solúvel</td></tr><tr><td>Leite em pó</td></tr></table></div></article></div></section>');
 await page.evaluate(()=>{window.irParaIngredientes=()=>window.destination='ingredients';window.irParaFormuladorDosIngredientes=()=>window.destination='products';});
 await page.addScriptTag({content:"const DB=[{n:'Café solúvel',src:'Usuário',ref:'Fornecedor da equipe'},{n:'Leite em pó',src:'TACO',ref:'TACO/UNICAMP'}];"});
 await page.addScriptTag({path:'gmf-ingredients.js'});
 assert.equal(await page.getByText(/Cadastro da equipe \/ fornecedor/).count(),1);
 assert.equal(await page.getByText(/Base genérica — referência pendente/).count(),1);
 await page.getByRole('button',{name:'Lista de ingredientes',exact:true}).click();
 assert.equal(await page.evaluate(()=>window.destination),'ingredients');
 assert.equal(await page.evaluate(()=>document.querySelector('#step6>div').children[1].tagName),'ARTICLE');
 await page.locator('#i2IngredientSearch').fill('cafe');
 assert.equal(await page.locator('#ing_lista tr:visible').count(),2);
 await page.getByRole('button',{name:'Produtos',exact:true}).click();
 assert.equal(await page.evaluate(()=>window.destination),'products');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.close();
 }
 console.log('Ingredientes: acesso interno, retorno, lista antes do cadastro, busca sem acentos e mobile passaram.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
