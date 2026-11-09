import type {Edition,Sex,SystemId} from './anatomy';

/** Nomes e resumos em português brasileiro. Termos não revisados permanecem no idioma da fonte. */
export const SYSTEMS_PT:Partial<Record<SystemId,{name:string;description:string}>> = {
 skeletal:{name:'Esquelético',description:'Os ossos sustentam o corpo, protegem órgãos e oferecem pontos de fixação aos músculos. O tecido ósseo também armazena minerais e participa da produção de células sanguíneas.'},
 muscular:{name:'Muscular',description:'Os músculos esqueléticos produzem movimento por meio de suas fixações. Em conjunto com os tendões, movimentam articulações, estabilizam a postura e produzem calor.'},
 cardiac:{name:'Coração',description:'O coração é uma bomba muscular com quatro câmaras. Suas valvas direcionam o sangue pelos circuitos pulmonar e sistêmico.'},
 sensory:{name:'Órgãos dos sentidos',description:'Estas estruturas participam dos sentidos especiais, como visão, audição e equilíbrio. Tecidos especializados detectam estímulos e trabalham com o sistema nervoso.'},
 arterial:{name:'Artérias',description:'As artérias conduzem o sangue para longe do coração, levando-o aos tecidos ou, no circuito pulmonar, aos pulmões.'},
 venous:{name:'Veias',description:'As veias conduzem o sangue de volta ao coração. Redes superficiais e profundas recolhem o sangue dos tecidos.'},
 nervous:{name:'Sistema nervoso',description:'O encéfalo, a medula espinal e os nervos conduzem e processam sinais. Participam da sensibilidade, dos movimentos, da coordenação e da regulação das funções corporais.'},
 brain:{name:'Regiões do encéfalo',description:'O encéfalo está dividido em regiões que podem ser selecionadas individualmente. A medula espinal e os nervos periféricos permanecem no sistema nervoso.'},
 respiratory:{name:'Respiratório',description:'As vias aéreas conduzem o ar até os pulmões, onde ocorrem as trocas de oxigênio e dióxido de carbono entre o ar e o sangue.'},
 digestive:{name:'Digestório',description:'O sistema digestório recebe e transforma os alimentos, absorve nutrientes e água e conduz os resíduos para eliminação.'},
 urinary:{name:'Urinário',description:'Os rins filtram o sangue e produzem urina. Ureteres, bexiga urinária e uretra participam do transporte, armazenamento e eliminação da urina.'},
 lymphatic:{name:'Linfático',description:'Vasos, linfonodos e órgãos linfáticos transportam a linfa e participam da defesa imunológica.'},
 endocrine:{name:'Endócrino',description:'Glândulas e tecidos endócrinos liberam hormônios que ajudam a regular metabolismo, crescimento, reprodução e equilíbrio interno.'},
 reproductive:{name:'Reprodutor',description:'As estruturas reprodutoras representadas participam da produção e do transporte de células reprodutivas e de hormônios sexuais.'},
 integumentary:{name:'Tegumentar',description:'A superfície corporal forma uma barreira protetora, participa da sensibilidade e ajuda a regular a temperatura.'},
 connective:{name:'Tecido conjuntivo',description:'Cartilagens, ligamentos e outros tecidos conjuntivos sustentam, conectam e separam estruturas do corpo.'},
 pregnancy:{name:'Gestação',description:'Estas estruturas pertencem a uma referência anatômica de gestação e são apresentadas separadamente do modelo corporal de referência.'},
 borrowed:{name:'Ossos do modelo masculino',description:'Estas estruturas ósseas foram incorporadas de uma referência masculina para preencher regiões não modeladas pela fonte feminina. A origem é indicada para evitar confusão entre conjuntos de dados.'},
 'donor-muscle':{name:'Músculos de membro inferior de doadora',description:'Estas estruturas musculares vêm de uma segunda referência feminina e complementam regiões musculares ausentes no conjunto principal.'},
};

export const EDITIONS_PT:Record<Sex,Partial<Edition>> = {
 male:{
  label:'Masculino',
  caption:'ADULTO · REFERÊNCIA MASCULINA',
  summary:'2.234 malhas individuais e 3.432 conceitos nomeados de uma referência anatômica masculina adulta.',
  limits:'Referência de corpo inteiro que abrange os sistemas modelados. As estruturas reprodutoras começam ocultas; ative esse sistema para visualizá-las.',
  credit:'BodyParts3D, © Database Center for Life Science. Licença Creative Commons Atribuição 4.0 Internacional.',
 },
 female:{
  label:'Feminino',
  caption:'ADULTA · REFERÊNCIA FEMININA',
  summary:'964 malhas individuais e 1.173 conceitos nomeados da montagem de referência feminina, acrescidos de 180 ossos provenientes da referência masculina e 76 músculos da perna de uma segunda referência feminina.',
  limits:'Esta montagem inclui superfície corporal, encéfalo e órgãos selecionados, incluindo estruturas reprodutoras femininas. A cobertura óssea original limita-se à coluna vertebral, ao esterno, à pelve e aos joelhos; crânio, costelas, ossos dos braços e dos pés são provenientes da referência masculina e aparecem em uma camada separada, desativada inicialmente. A cobertura muscular é limitada: músculos do quadril, da coxa e da perna vêm de uma segunda referência feminina e são identificados como músculos de membro inferior de doadora. Nenhum músculo foi copiado da referência masculina. Placenta e estruturas umbilicais pertencem a uma referência de gestação e também começam ocultas.',
  credit:'Human Reference Atlas feminino v1.10, de Kristen Brown e Heidi Schlehlein, baseado no Visible Human Project da National Library of Medicine. Os músculos de membro inferior vêm de uma referência feminina adicional. Conjuntos licenciados sob Creative Commons Atribuição 4.0 Internacional.',
 },
};
