/** Relações didáticas conservadoras: só estruturas que existem no catálogo feminino.
 * Relações anatômicas gerais, não inferidas pela proximidade das malhas.
 * Os nomes de destino são nomes literais do manifesto feminino.
 */
export type AnatomyRelation = { kind: string; structures: string[]; explanation: string };
const RELATIONS: Record<string, AnatomyRelation[]> = {
 'optic nerve': [
  {kind:'Via visual',structures:['Retina (right)','Retina (left)','Optic disc (right)','Optic disc (left)'],explanation:'As fibras nervosas da retina convergem no disco óptico e formam o nervo óptico, que conduz sinais visuais em direção ao encéfalo.'}
 ],
 'retina': [
  {kind:'Continuidade funcional',structures:['Optic disc (right)','Optic disc (left)','Right optic nerve','Left optic nerve','Macula lutea (right)','Macula lutea (left)'],explanation:'A retina contém fotorreceptores; seus axônios convergem no disco óptico e seguem pelo nervo óptico. A mácula é uma região especializada da retina.'}
 ],
 'body of uterus': [
  {kind:'Sistema reprodutor',structures:['Fundus of uterus','Lower uterine segment','Posterior wall of uterus','Anterior wall of uterus','Left uterine tube','Right uterine tube','Left uterine artery','Right uterine artery','Left uterine vein','Right uterine vein'],explanation:'O corpo integra o útero. As tubas uterinas se comunicam com a região superior do útero; artérias e veias uterinas participam de sua irrigação e drenagem.'}
 ],
 'ovary': [
  {kind:'Conexões anatômicas',structures:['Suspensory ligament of ovary (right)','Suspensory ligament of ovary (left)','Left uterine tube','Right uterine tube','Left uterine artery','Right uterine artery'],explanation:'Os ovários relacionam-se com as tubas uterinas. O ligamento suspensor conduz vasos ovarianos; a relação indicada é anatômica, não uma conexão direta entre todas as estruturas listadas.'}
 ],
 'anterior cruciate ligament of knee': [
  {kind:'Estabilização do joelho',structures:['Femur (right)','Femur (left)','Tibia (right)','Tibia (left)','Anterior cruciate enthesis (right)','Anterior cruciate enthesis (left)'],explanation:'O ligamento cruzado anterior conecta fêmur e tíbia e ajuda a limitar o deslocamento anterior da tíbia. As enteses representam suas regiões de fixação.'}
 ],
 'posterior cruciate ligament of knee': [
  {kind:'Estabilização do joelho',structures:['Femur (right)','Femur (left)','Tibia (right)','Tibia (left)','Posterior cruciate enthesis (right)','Posterior cruciate enthesis (left)'],explanation:'O ligamento cruzado posterior conecta fêmur e tíbia e ajuda a limitar o deslocamento posterior da tíbia. As enteses representam suas regiões de fixação.'}
 ],
 'patellar ligament': [
  {kind:'Aparelho extensor',structures:['Patella (right)','Patella (left)','Tibia (right)','Tibia (left)','Tendon of quadriceps femoris (right)','Tendon of quadriceps femoris (left)'],explanation:'O ligamento patelar continua o mecanismo extensor do joelho entre a patela e a tuberosidade da tíbia; acima da patela, o tendão do quadríceps transmite a força muscular.'}
 ],
 'tendon of quadriceps femoris': [
  {kind:'Aparelho extensor',structures:['Patella (right)','Patella (left)','Patellar ligament (right)','Patellar ligament (left)'],explanation:'O tendão do quadríceps insere-se na patela. A força segue pelo ligamento patelar até a tíbia, permitindo a extensão do joelho.'}
 ]
};
const normalize = (raw:string) => raw.toLowerCase().replace(/^(right|left) /,'').replace(/ \((right|left)\)$/,'').replace(/\s+/g,' ').trim();
export const anatomyRelations = (raw:string):AnatomyRelation[] => RELATIONS[normalize(raw)] ?? [];
