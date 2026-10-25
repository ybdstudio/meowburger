/* =====================================================================
   00_config.js — every tunable number lives here (data-driven design)
   ===================================================================== */
const VERSION='1.0.0';   /* Meow Sakura */
const SAVE_KEY='meowsakura.v3', LEGACY_SAVE_KEY='meowsakura.v0'; /* v4 keeps the v3 save format */
const REF=144;          // sprite resolution: px per tile width for object sprites
const REF_C=128;        // sprite resolution for character sheets

const CFG={
  startMoney:90,
  stationReach:0.55,   // how close (to the machine footprint) the owner must be to load / collect
  sleepAfter:10, wakeRadius:1.3, cleanerCarry:4,
  doze:{after:[75,140] /* s of work before a worker may nod off */, maxSleep:35 /* wakes by itself after this */, wakeBoost:6 /* s of faster walking after you wake them */},
  player:{baseSpeed:3.3*0.8 /* v2 speed 3.3, reduced exactly 20% */, speedPerLevel:0.4*0.8 /* scaled with the base speed: 0.32 */, carryBase:4, carryPerLevel:2, radius:0.26},
  npcSpeed:{customer:2.3, worker:2.3},
  queueMax:5,
  patience:{normal:55, vip:110, perItem:5, impatientAt:0.35},
  spawn:{tutorial:3.2, base:2.2, rand:2.6, flowStep:0.1, grandMul:0.55},
  vip:{first:8, interval:[45,70], items:[4,6], tipMul:1.6},
  boost:{dur:60, cd:120},   // kept for old saves; the ad scenario uses CFG.ads.rush
  xp:{base:6, perLevel:6},
  decorBonus:0.05,          // +5% to every sale per decoration bought
  stageNames:['Chicken Corner','Meow Sakura Diner','Bigger Restaurant','Patio & Grand Opening'],
  minis:{clientKey:''},
  /* Ad scenario v4.6 — Meow Pizza placements (labels match the Meow Sushi config). Times in seconds.
     Ads are shown through Ads.adapter (HS SDK goes there); without it a test ad is simulated. */
  ads:{
    doubleTask:{min:20, max:150, show:10, cd:45},  // x2 Task Bonus: after a task pays coins -> the same reward again (max 150)
    buyingPad:{stuck:12, cd:90, maxShare:.5},     // Buying Pad (coin bag): short on coins for the current purchase for 12 s -> the shortfall, max 50% of the price
    rush:{dur:60, cd:100},                         // Meow Rush: 2x cooking speed + 30% walk for 60 s
    vipTip:{show:10, cd:60},                       // VIP tip x2: after a VIP pays -> that VIP's bill again
    coinPurchase:{reward:100, cd:120},             // Coin Purchase: not enough coins for an upgrade / Shop / coin "+" -> +100
    grandOpening:{reward:200, show:15},            // Grand Opening: after each new stage opens and after the grand opening -> +200
    inter:{every:45, afterTask:'t_take', afterReward:30}, // Grill Break (Meow Sakura: earlier first ad, 45 s spacing): every 45 s of play, at a safe moment, >= 30 s after a rewarded ad
  },
  /* Engagement gifts — fixed amount per claim */
  gifts:{revisit:100, share:50, home:100, showAfter:'t_upgrade'},
  /* Auto play (AUTO button). Off in this build: button hidden, saved S.auto ignored */
  autoPlay:false,
};
const round10=n=>Math.max(10,Math.round(n/10)*10);

/* Food & carried items. price = coins per unit (before restaurant/decor bonuses). */
const ITEMS={
  pizza:    {cat:'food', price:5,  name:'Fried Chicken', step:.2},
  drink:    {cat:'food', price:4,  name:'Cat Cola',   step:.2},
  pepperoni:{cat:'food', price:9,  name:'Cheeseburger', step:.15},
  dessert:  {cat:'food', price:12, name:'Fries', step:.17},
  veggie:   {cat:'food', price:10, name:'Garden Salad', step:.11},
  seafood:  {cat:'food', price:16, name:'Chicken Burger', step:.15},
  special:  {cat:'food', price:22, name:'Deluxe Burger', step:.17},
  ing:      {cat:'ing',  name:'Ingredients', step:.2},
  trash:    {cat:'trash',name:'Used tray', step:.06},
};
const FOODS=['pizza','drink','pepperoni','dessert','veggie','seafood','special'];
const PIZZAS=['pizza','pepperoni','veggie','seafood','special'];

/* Production stations. interval in seconds per item; kitchen speed upgrade multiplies by 0.78^lvl. */
const STATIONS={
  oven:   {item:'pizza',    interval:2.4, cap:4, capStep:2, sprite:'st_oven'},
  drink:  {item:'drink',    interval:2.2, cap:5, capStep:2, sprite:'st_drink'},
  prep:   {item:'pepperoni',interval:3.6, cap:4, capStep:1, needs:true, perIng:2, ingCap:6, sprite:'st_prep'},
  dessert:{item:'dessert',  interval:4.2, cap:4, capStep:1, needs:true, perIng:2, ingCap:6, sprite:'st_dessert'},
  veggie: {item:'veggie',   interval:3.8, cap:4, capStep:1, needs:true, perIng:2, ingCap:6, sprite:'st_veggie'},
  seafood:{item:'seafood',  interval:4.8, cap:3, capStep:1, needs:true, perIng:1, ingCap:6, sprite:'st_seafood'},
  special:{item:'special',  interval:5.5, cap:3, capStep:1, needs:true, perIng:1, ingCap:6, sprite:'st_special'},
  pantry: {item:'ing',      interval:3.2, cap:6, sprite:'st_pantry'},
};

/* Upgrade tracks. cost[i] = price to go from level i to i+1. */
const UPG={
  kitchen:{title:'KITCHEN',rows:[
    {key:'spd',  label:'SPEED',    icon:'speed',   max:5,cost:[0,60,140,260,420], desc:'All stations cook faster'},
    {key:'cap',  label:'CAPACITY', icon:'capacity',max:5,cost:[0,60,140,260,420], desc:'Stations hold more food'},
    {key:'store',label:'STORAGE',  icon:'storage', max:4,cost:[80,160,280,420],   desc:'Pantry holds more', req:'pantry'},
    {key:'sup',  label:'SUPPLIER', icon:'supplier',max:3,cost:[120,240,400],      desc:'Pantry restocks faster', req:'pantry'}]},
  manager:{title:'MANAGER',rows:[
    {key:'mSpd',  label:'SPEED',icon:'run',  max:5,cost:[60,120,200,320,480], desc:'You walk faster'},
    {key:'mCarry',label:'CARRY',icon:'carry',max:5,cost:[50,100,170,260,380], desc:'You carry 2 more'}]},
  rest:{title:'RESTAURANT',rows:[
    {key:'rPrice',label:'PRICE',    icon:'price',max:5,cost:[120,220,360,550,800], desc:'Every dish sells for more'},
    {key:'rFlow', label:'CUSTOMERS',icon:'flow', max:5,cost:[100,180,300,460,700], desc:'Customers arrive faster'}]},
};

/* Map zones (Meow Sakura v1.2). Back walls run along y=0 and x=0.
   kitchen = one block behind the PICK UP counter (left), hall = queue + dining right next to the queue,
   expansion: kitchen annex below the kitchen, dining hall below the hall, patio below that. Customers enter from the right. */
const ZONES=[
  {id:'kitchen', x:0, y:0, w:7, d:11, kind:'kitchen', open:true},
  {id:'hall',    x:7, y:0, w:11.5, d:11, kind:'hall',    open:true},
  {id:'dining',  x:8.4,y:0,w:10.1,d:7.6,kind:'dining', open:true},
  {id:'hall2',   x:7, y:11,w:11.5, d:7, kind:'dining',  spot:'expand_hall2'},
  {id:'kitchen2',x:0, y:11,w:7, d:8.6, kind:'kitchen', spot:'expand_kitchen2'},
  {id:'upper',   x:7, y:18,w:11.5,d:6.5,  kind:'patio',   spot:'expand_upper'},
];
const LANE={x0:18.5, x1:23, y0:7.6, y1:9.4};     // customers walk in/out here (the street path on the right)
const SPAWN_PT=[22,8.4], EXIT_PT=[22.4,8.8];

/* counter: true-iso PICK UP counter, register at its lower end (cashier side) */
const COUNTER={x:6.3,y:3.0,w:1.1,d:6.0};
const PT={ tray:[5.6,5.2], cashier:[5.6,8.4], pile:[5.2,9.7],
  padKitchen:[4.2,5.2], padManager:[17.2,16.9], padRest:[17.3,10.1],
  homeHelper:[3.8,3.2], homeWaiter:[9.4,9.9], homeCleaner:[13.25,7.1], queue0:[8.4,8.45], queueStep:0.95,
  mgr:[17.9,13.9] };

/* Purchasable spots. unlock = task id that reveals it. zone = zone it stands in. */
const SPOTS=[
 {id:'register',label:'Pickup counter',cost:30,  fp:[COUNTER.x,COUNTER.y,COUNTER.w,COUNTER.d],unlock:'t_register', kind:'register'},
 {id:'oven1',   label:'Chicken station',cost:40, fp:[0,0.3,1.3,2.3], unlock:'t_oven',     kind:'station', st:'oven', pt:[1.85,1.45]},
 {id:'table1',  label:'Table',         cost:20,  fp:[10.25,1.25,1.3,1.3],unlock:'t_table',    kind:'table'},
 {id:'bin',     label:'Trash bin',     cost:5,   fp:[12.95,6.5,0.6,0.6],unlock:'t_bin',     kind:'bin'},
 {id:'table2',  label:'Table',         cost:60,  fp:[14.95,1.25,1.3,1.3],unlock:'t_table2',   kind:'table'},
 {id:'drink',   label:'Soda fountain', cost:90,  fp:[2.3,0,1.5,1.25],  unlock:'t_drink',    kind:'station', st:'drink', pt:[3.05,1.8]},
 {id:'renovate',label:'Meow Sakura Diner', cost:300, fp:[13.6,9.9,1.1,0.8],unlock:'t_renovate', kind:'stage', stage:1},
 {id:'pantry',  label:'Storage shelf', cost:150, fp:[0,3.75,0.6,1.1],  unlock:'t_pantry',kind:'station', st:'pantry', pt:[1.1,4.3]},
 {id:'prep',    label:'Burger station',cost:180, fp:[0,5.4,1.3,2.0],  unlock:'t_prep',    kind:'station', st:'prep', pt:[1.85,6.4]},
 {id:'office',  label:'Manager desk',  cost:600, fp:[17.35,12.9,0.8,0.65],unlock:'t_office',  kind:'office', zone:'hall2'},
 {id:'cashier', label:'Cashier cat',   cost:340, fp:[4.4,9.0,0.8,0.8],unlock:'t_hire1',    kind:'hire', worker:'cashier'},
 {id:'table3',  label:'Table',         cost:150, fp:[10.25,4.75,1.3,1.3],unlock:'t_table3',   kind:'table'},
 {id:'expand_kitchen2',label:'Bigger kitchen',cost:420,fp:[4.3,10.0,1.1,0.8],unlock:'t_expandk',kind:'zone', zones:['kitchen2']},
 {id:'oven2',   label:'Chicken station',cost:240, fp:[0,11.4,1.3,2.3], unlock:'t_oven2',   kind:'station', st:'oven', pt:[1.85,12.55], zone:'kitchen2'},
 {id:'expand_hall2',label:'New dining hall',cost:500,fp:[16.0,9.95,1.1,0.8],unlock:'t_expand1',kind:'zone', zones:['hall2'], stage:2},
 {id:'table5',  label:'Family table',  cost:190, fp:[10.25,11.8,1.3,2.95],unlock:'t_table5',   kind:'table4p', zone:'hall2'},
 {id:'bin2',    label:'Trash bin',     cost:20,  fp:[7.3,14.4,0.6,0.6],unlock:'t_table5',  kind:'bin', zone:'hall2', optional:true},
 {id:'dessert', label:'Fries fryer',   cost:340, fp:[4.4,0,1.5,1.25],  unlock:'t_dessert',  kind:'station', st:'dessert', pt:[5.15,1.8]},
 {id:'veggie',  label:'Salad station', cost:320, fp:[0,8.2,1.3,1.8],  unlock:'t_veggie',  kind:'station', st:'veggie', pt:[1.85,9.1]},
 {id:'decor1',  label:'Planter',       cost:60,  fp:[13.4,17.3,1.4,0.5],unlock:'t_decor',   kind:'decor', sprite:'planter', zone:'hall2'},
 {id:'decor2',  label:'Menu stand',    cost:80,  fp:[17.7,11.3,0.5,0.5],unlock:'t_decor',  kind:'decor', sprite:'signstand', zone:'hall2'},
 {id:'decor3',  label:'Big plant',     cost:100, fp:[17.7,17.1,0.6,0.6],unlock:'t_decor',  kind:'decor', sprite:'plant', zone:'hall2'},
 {id:'helper',  label:'Kitchen runner',cost:480, fp:[3.3,2.6,0.8,0.8],unlock:'t_hire2',    kind:'hire', worker:'helper'},
 {id:'table6',  label:'Family table',  cost:240, fp:[14.95,11.8,1.3,2.95],unlock:'t_table6',   kind:'table4p', zone:'hall2'},
 {id:'waiter',  label:'Food runner',   cost:420, fp:[9.0,10.1,0.8,0.8],unlock:'t_hire3',    kind:'hire', worker:'waiter'},
 {id:'cleaner', label:'Cleaner cat',   cost:300, fp:[12.85,3.4,0.8,0.8],unlock:'t_hire4',   kind:'hire', worker:'cleaner'},
 {id:'vip',     label:'VIP table',     cost:420, fp:[10.25,15.9,1.3,1.3],unlock:'t_vip',     kind:'vip', zone:'hall2'},
 {id:'table4',  label:'Table',         cost:220, fp:[14.95,4.75,1.3,1.3],unlock:'t_table4',   kind:'table'},
 {id:'seafood', label:'Chicken burger station',cost:560,fp:[0,14.3,1.3,1.8],unlock:'t_seafood',kind:'station', st:'seafood', pt:[1.85,15.2], zone:'kitchen2'},
 {id:'special', label:'Deluxe burger station',cost:820, fp:[0,16.7,1.3,2.0],unlock:'t_special',  kind:'station', st:'special', pt:[1.85,17.7], zone:'kitchen2'},
 {id:'expand_upper',label:'Patio terrace',cost:950,fp:[16.0,17.3,1.0,0.6],unlock:'t_upper',  kind:'zone', zones:['upper'], stage:3},
 {id:'table7',  label:'Table',         cost:250, fp:[10.25,19.6,1.3,1.3],unlock:'t_grand',   kind:'table', zone:'upper'},
 {id:'table8',  label:'Family table',  cost:300, fp:[14.95,19.4,1.3,2.95],unlock:'t_patio1',   kind:'table4p', zone:'upper'},
 {id:'ribbon',  label:'Grand opening', cost:300, fp:[7.7,20.7,1.0,0.8],unlock:'t_ribbon', kind:'event', zone:'upper'},
];

/* One primary task at a time. kinds: buy | count (stat delta) | level (upgrade lvl) | custom | final
   Staff: cashier ~3 min, cleaner ~8 min, food runner ~11 min, kitchen runner ~17 min, manager last (after every role). */
const TASKS=[
 {id:'t_register',text:'Build the pickup counter',kind:'buy',spot:'register'},
 {id:'t_oven',    text:'Buy a chicken station',kind:'buy',spot:'oven1'},
 {id:'t_take',    text:'Take the fried chicken',kind:'custom',check:'hasPizza',target:'oven1'},
 {id:'t_deliver', text:'Put the chicken on the pickup counter',kind:'custom',check:'trayHas',target:'tray'},
 {id:'t_cashier', text:'Stand at the cash register',kind:'custom',check:'servedOne',target:'cashier'},
 {id:'t_table',   text:'Buy a table',kind:'buy',spot:'table1'},
 {id:'t_money',   text:'Collect the money',kind:'custom',check:'collectedAny',target:'pile'},
 {id:'t_bin',     text:'Buy a trash bin',kind:'buy',spot:'bin'},
 {id:'t_trash',   text:'Throw the used tray in the bin',kind:'custom',check:'dumpedAny',target:'trash'},
 {id:'t_upgrade', text:'Upgrade the kitchen',kind:'custom',check:'anyKitchenUp',target:'padKitchen'},
 {id:'t_serve5',  text:'Serve 5 customers',kind:'count',stat:'served',n:5,reward:30},
 {id:'t_table2',  text:'Unlock a new table',kind:'buy',spot:'table2',reward:20},
 {id:'t_drink',   text:'New drink: Cat Cola',kind:'buy',spot:'drink',reward:30},
 {id:'t_cook10',  text:'Fry 10 chicken buckets',kind:'count',stat:'cooked_pizza',n:10,reward:40},
 {id:'t_hire1',   text:'Hire a cashier cat',kind:'buy',spot:'cashier',reward:60},
 {id:'t_collect100',text:'Collect 100 coins',kind:'count',stat:'collected',n:100,reward:40},
 {id:'t_renovate',text:'Renovate into Meow Sakura Diner',kind:'buy',spot:'renovate',reward:50},
 {id:'t_pantry',  text:'Build the storage shelf',kind:'buy',spot:'pantry',reward:40},
 {id:'t_prep',    text:'New recipe: Cheeseburger',kind:'buy',spot:'prep',reward:50},
 {id:'t_loadprep',text:'Bring patties to the burger station',kind:'count',stat:'loaded',n:3,reward:30,target:'pantry'},
 {id:'t_table3',  text:'Unlock a third table',kind:'buy',spot:'table3',reward:40},
 {id:'t_hire4',   text:'Hire a cleaner cat',kind:'buy',spot:'cleaner',reward:60},
 {id:'t_store',   text:'Upgrade the storage shelf',kind:'level',key:'store',n:1,reward:40,target:'padKitchen'},
 {id:'t_flow',    text:'Attract more customers',kind:'level',key:'rFlow',n:1,reward:50,target:'padRest'},
 {id:'t_table4',  text:'Unlock the fourth table',kind:'buy',spot:'table4',reward:50},
 {id:'t_hire3',   text:'Hire a food runner',kind:'buy',spot:'waiter',reward:80},
 {id:'t_serve15', text:'Serve 15 customers',kind:'count',stat:'served',n:15,reward:80},
 {id:'t_expandk', text:'Expand the kitchen',kind:'buy',spot:'expand_kitchen2',reward:80},
 {id:'t_oven2',   text:'Build a second chicken station',kind:'buy',spot:'oven2',reward:50},
 {id:'t_expand1', text:'Expand: new dining hall',kind:'buy',spot:'expand_hall2',reward:80},
 {id:'t_table5',  text:'Add a family table',kind:'buy',spot:'table5',reward:50},
 {id:'t_dessert', text:'New side: Fries',kind:'buy',spot:'dessert',reward:80},
 {id:'t_veggie',  text:'New recipe: Garden Salad',kind:'buy',spot:'veggie',reward:80},
 {id:'t_hire2',   text:'Hire a kitchen runner to restock',kind:'buy',spot:'helper',reward:80},
 {id:'t_decor',   text:'Decorate the new hall',kind:'count',stat:'decor',n:3,reward:100},
 {id:'t_supplier',text:'Automate restocking',kind:'level',key:'sup',n:1,reward:80,target:'padKitchen'},
 {id:'t_speed3',  text:'Upgrade kitchen speed to Lv 3',kind:'level',key:'spd',n:3,reward:80,target:'padKitchen'},
 {id:'t_table6',  text:'Add another family table',kind:'buy',spot:'table6',reward:60},
 {id:'t_office',  text:'The manager arrives: open the manager desk',kind:'buy',spot:'office',reward:100},
 {id:'t_vip',     text:'Set up the VIP table',kind:'buy',spot:'vip',reward:80},
 {id:'t_vipserve',text:'Serve a special customer',kind:'count',stat:'vip',n:1,reward:150,target:'vip'},
 {id:'t_cap3',    text:'Upgrade kitchen capacity to Lv 3',kind:'level',key:'cap',n:3,reward:120,target:'padKitchen'},
 {id:'t_special', text:'Premium recipe: Deluxe Burger',kind:'buy',spot:'special',reward:150},
 {id:'t_seafood', text:'New recipe: Chicken Burger',kind:'buy',spot:'seafood',reward:120},
 {id:'t_cookspecial',text:'Make 5 Deluxe Burgers',kind:'count',stat:'cooked_special',n:5,reward:120,target:'special'},
 {id:'t_upper',   text:'Open the patio terrace',kind:'buy',spot:'expand_upper',reward:150},
 {id:'t_ribbon',  text:'Prepare the grand opening',kind:'buy',spot:'ribbon'},
 {id:'t_grand',   text:'Grand opening: serve 10 customers',kind:'count',stat:'served',n:10,reward:500},
 {id:'t_patio1',  text:'Patio: add a terrace table',kind:'buy',spot:'table7',reward:120},
 {id:'t_patio2',  text:'Patio: add a family table',kind:'buy',spot:'table8',reward:150},
 {id:'t_price3',  text:'Raise menu prices to Lv 3',kind:'level',key:'rPrice',n:3,reward:200,target:'padRest'},
 {id:'t_serve50', text:'Serve 50 customers on the patio days',kind:'count',stat:'served',n:50,reward:300},
 {id:'t_flow4',   text:'Attract crowds: customers Lv 4',kind:'level',key:'rFlow',n:4,reward:300,target:'padRest'},
 {id:'t_done',    text:'Sakura Palace complete! Keep growing',kind:'final'},
];
const TASK_PHASE=[ // for the Map screen and docs
 {stage:0,from:'t_register',to:'t_collect100'},
 {stage:1,from:'t_renovate',to:'t_oven2'},
 {stage:2,from:'t_expand1',to:'t_cap3'},
 {stage:3,from:'t_special',to:'t_grand'},
];
const taskIndex=id=>TASKS.findIndex(t=>t.id===id);

/* Optional secondary objective (shown under the main task, rotates after completion) */
const SIDE_GOALS=[
 {text:'Serve 3 customers in a row',kind:'streak',n:3,reward:15},
 {text:'Collect 60 coins',stat:'collected',n:60,reward:10},
 {text:'Bake 8 dishes',stat:'cookedAll',n:8,reward:12},
 {text:'Clear 3 dirty plates',stat:'dumped',n:3,reward:10},
 {text:'Serve 5 customers in a row',kind:'streak',n:5,reward:25},
];
