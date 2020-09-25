function processInput() {
  
  var input = document.querySelector("#input").value;
  var indx = input.indexOf("/reports/")+"/reports/".length;
  if (input.length>16)
    input = input.slice(indx,indx+16);
  else if (input.length<16) {
    document.getElementById("page").innerHTML = "Error, invalid report ID.";
    return
  }
  
  document.getElementById("page").innerHTML = "Loading . . .";
  
  var logID = input; 
  var API = "&api_key=120a438a467e97b900a062c8a7a34000";

  var baseURL = "https://classic.warcraftlogs.com:443/v1/report";
  var filter = "&filter=encounterID%20%21%3D%200%20";
  try {
    var fightData = new XMLHttpRequest();
    fightData.open("Get", baseURL + "/fights/" + logID + "?" + API.slice(1,API.length), false);
    fightData.send(null);
    fightData = JSON.parse(fightData.response);
    var debuffData = new XMLHttpRequest();
    debuffData.open("Get", baseURL + "/events/debuffs/" + logID + "?start=0&end=100000000&hostility=1&wipes=2&filter=encounterID%21%3D0" + API, false);
    debuffData.send(null);
    debuffData = JSON.parse(debuffData.response);
  
    var nextTime = debuffData.nextPageTimestamp;
    while (nextTime>1) {
      var dataadd = new XMLHttpRequest();
      dataadd.open("Get", baseURL + "/events/debuffs/" + logID + "?start=" + nextTime + "&end=100000000&hostility=1&wipes=2&filter=encounterID%21%3D0" + API, false);
      dataadd.send(null);
      dataadd = JSON.parse(dataadd.response);
      debuffData.events = debuffData.events.concat(dataadd.events);
      nextTime = dataadd.nextPageTimestamp;
    }
  }
  catch(err) {
    document.getElementById("page").innerHTML = "Error: " + err.message; 
    return
  }
  
  var bossIDs = new Array;
  var enemyIDs = new Array;
  var count = 0;
  for (var i=0; i<fightData.enemies.length; i++) {
    if (fightData.enemies[i].type == "Boss") {
      bossIDs[count] = fightData.enemies[i].id; 
      count++
    }
    enemyIDs[i] = fightData.enemies[i].id;
  }
  
  var bossStarts = new Array;
  var bossEnds = new Array;
  var bossNames = new Array;
  var val = 0;
  count = 0;
  for (var i=0; i<bossIDs.length; i++) {
    val = bossIDs[i];
    bossNames[count]  = fightData.fights[fightData.enemies[enemyIDs.indexOf(val)].fights[0].id-1].name;
    bossStarts[count] = fightData.fights[fightData.enemies[enemyIDs.indexOf(val)].fights[0].id-1].start_time;
    bossEnds[count]   = fightData.fights[fightData.enemies[enemyIDs.indexOf(val)].fights[0].id-1].end_time;
    count++
  }
  
  var debuffEdit = debuffData.events; 
  var index = new Array;
  for (var i=debuffEdit.length-1; i>=0; i--) {
    if (bossIDs.indexOf(debuffEdit[i].targetID) == -1 || debuffEdit[i].type == "removedebuffstack" || debuffEdit[i].type == "applydebuffstack" || debuffEdit[i].type == "refreshdebuff") {
      debuffEdit.splice(i,1);}
    else if (debuffEdit[i].type == "removedebuff" && debuffEdit[i].ability.name == "Deep Wound") {
      debuffEdit.splice(i,1);}
    else if (debuffEdit[i].type == "removedebuff" && debuffEdit[i].ability.name == "Fireball") {
      debuffEdit.splice(i,1);}
    else if (debuffEdit[i].type == "removedebuff" && debuffEdit[i].ability.name == "Pyroblast") {
      debuffEdit.splice(i,1);}
    else {
      for (var j=0; j<bossStarts.length; j++) {
        if (debuffEdit[i].timestamp>bossEnds[j]-1000 && debuffEdit[i].timestamp<bossEnds[j]+1000) {     
          debuffEdit.splice(i,1);
          break
        }
      }      
    }
  }
  
  var timestampList = new Array;
  count = 0;
  for (var i=0; i<debuffEdit.length; i++) {
    if (debuffEdit[i].type == "removedebuff") {
      timestampList[count] = debuffEdit[i].timestamp;
      count++
    }
  }
  
  for (var i=debuffEdit.length-1; i>=0; i--) {
    count = 0;
    for (var j=0; j<timestampList.length; j++) {
      if (debuffEdit[i].timestamp == timestampList[j])
        count++;
    }
    if (count < 1)
      debuffEdit.splice(i,1);
  }
  
  for (var k=1; k<=5; k++) {
    for (var i=debuffEdit.length-1; i>=0; i--) {
      if (i == debuffEdit.length-1) {
        if (debuffEdit[i].type == "removedebuff")
          debuffEdit.splice(i,1);
      }
      else if (i == 0) {
        if (debuffEdit[i].type == "applydebuff")
          debuffEdit.splice(i,1);
      }
      else if (debuffEdit[i].type == "removedebuff" && debuffEdit[i].timestamp<debuffEdit[i+1].timestamp)
        debuffEdit.splice(i,1);
      else if (debuffEdit[i].type == "applydebuff" && debuffEdit[i].timestamp>debuffEdit[i-1].timestamp)
        debuffEdit.splice(i,1);
    }
    
    var timestampList = new Array;
    for (var i=0; i<debuffEdit.length; i++) {
      timestampList[i] = debuffEdit[i].timestamp;
    }
    
    for (var i=debuffEdit.length-1; i>=0; i--) {
      count = 0;
      for (var j=0; j<timestampList.length; j++) {
        if (debuffEdit[i].timestamp == timestampList[j])
          count++;
      }
      if (count < 2)
        debuffEdit.splice(i,1);
    }
  }
  
  for (var k=1; k<=5; k++) {
    for (var i=1; i<debuffEdit.length; i++) {
      if (debuffEdit[i].ability.name == "Faerie Fire (Feral)") {
        debuffEdit[i].ability.name = "Faerie Fire";}
      if (debuffEdit[i].type == "removedebuff" && debuffEdit[i].timestamp == debuffEdit[i-1].timestamp && debuffEdit[i-1].type == "applydebuff") {
        for (j=i; j<=i+10; j++) {
          if (debuffEdit[j].timestamp == debuffEdit[i-1].timestamp) {
            debuffEdit[j].timestamp = debuffEdit[j].timestamp + 1;
          }
        }
      }
    }
  }
  
  var timestampList = new Array;
  for (var i=0; i<debuffEdit.length; i++) {
    timestampList[i] = debuffEdit[i].timestamp;
  }
  
  var uniqueStamps = timestampList.filter(onlyUnique);
  var currentBoss = "None";
  var currentStart = 0;
  var idx = 0;
  var timeAt = 0;
  var output = new Array;
  var rb = "</td><td>" + " removed by " + "</td><td>";
  var tdtr = "</td></tr>";
  output[0] = "<table><tr><th colspan='4'>" + "Report ID: " + logID + "</th></tr>";
  count = 0;
  for (var i=0; i<uniqueStamps.length; i++) {
    idx = timestampList.indexOf(uniqueStamps[i]);

    for (var j=0; j<bossNames.length; j++) {
      if (uniqueStamps[i]>bossStarts[j] && uniqueStamps[i]<bossEnds[j] && bossNames[j]!==currentBoss) {
        currentBoss = bossNames[j];
        currentStart = bossStarts[j];
        if (i!==0) 
          output.push("<tr><th colspan='4'></th></tr>")
        output.push("<tr><th colspan='4'>" + "--- " + currentBoss + " (" + Math.round((bossEnds[j]-bossStarts[j])/1000) + "s fight) ---" + "</th></tr>")
        console.log(" ")
        console.log("--- " + currentBoss + ", with a duration of " + (bossEnds[j]-bossStarts[j])/1000 + " seconds ---")
      }
    }
    
    count = 0;
    for (var j=0; j<timestampList.length; j++) {
      if (uniqueStamps[i]==timestampList[j])
        count++;
    }
    
    timeAt = "<tr><td>" + formatNumber((debuffEdit[idx].timestamp-currentStart)/1000) + "</td><td>";
    if (count==2) {
      if (debuffEdit[idx].type == "removedebuff" && debuffEdit[idx+1].type == "applydebuff")
        if (debuffEdit[idx].ability.name!==debuffEdit[idx+1].ability.name)
          output.push(timeAt + debuffEdit[idx].ability.name + rb + debuffEdit[idx+1].ability.name) + tdtr
      else
        console.log(timeAt + ": Error, " + debuffEdit[idx].type + " " + debuffEdit[idx+1].type)   
    }
    
    else if (count==3) {
      if (debuffEdit[idx].type == "removedebuff" && debuffEdit[idx+1].type == "removedebuff" && debuffEdit[idx+2].type == "applydebuff") {
        if (debuffEdit[idx].ability.name == debuffEdit[idx+2].ability.name)
          output.push(timeAt + debuffEdit[idx+1].ability.name + rb + "Phantom Debuff (" + debuffEdit[idx+2].ability.name + ")" + tdtr);
        else if (debuffEdit[idx+1].ability.name == debuffEdit[idx+2].ability.name)
          output.push(timeAt + debuffEdit[idx].ability.name + rb + "Phantom Debuff (" + debuffEdit[idx+2].ability.name + ")" + tdtr);
        else
          output.push(timeAt + debuffEdit[idx].ability.name + " and " + debuffEdit[idx+1].ability.name + rb + debuffEdit[idx+2].ability.name + tdtr);
      }
      else if (debuffEdit[idx].type == "removedebuff" && debuffEdit[idx+1].type == "applydebuff" && debuffEdit[idx+2].type == "applydebuff") {
        output.push(timeAt + debuffEdit[idx].ability.name + rb + debuffEdit[idx+1].ability.name + " or " + debuffEdit[idx+2].ability.name + tdtr);
      }
      
      else 
        console.log(timeAt + ": Error, " + debuffEdit[idx].type + " " + debuffEdit[idx+1].type + " " + debuffEdit[idx+2].type)
        
    }
    else if (count==4) {
      if (debuffEdit[idx].type == "removedebuff" && debuffEdit[idx+1].type == "applydebuff" && debuffEdit[idx+2].type == "applydebuff" && debuffEdit[idx+3].type == "applydebuff") {
        console.log(timeAt + ": " + debuffEdit[idx].ability.name + " removed by " + debuffEdit[idx+1].ability.name + " or " + debuffEdit[idx+2].ability.name + " or " + debuffEdit[idx+3].ability.name)
      }
      else if (debuffEdit[idx].type == "removedebuff" && debuffEdit[idx+1].type == "applydebuff" && debuffEdit[idx+2].type == "removedebuff" && debuffEdit[idx+3].type == "applydebuff") {
        if (debuffEdit[idx].ability.name!==debuffEdit[idx+1].ability.name) {
          console.log(timeAt + ": " + debuffEdit[idx].ability.name + " removed by " + debuffEdit[idx+1].ability.name)}
          
        if (debuffEdit[idx+2].ability.name!==debuffEdit[idx+3].ability.name) {
          console.log(timeAt + ": " + debuffEdit[idx+2].ability.name + " removed by " + debuffEdit[idx+3].ability.name)}
      }
      else if (debuffEdit[idx].type == "removedebuff" && debuffEdit[idx+1].type == "removedebuff" && debuffEdit[idx+2].type == "applydebuff" && debuffEdit[idx+3].type == "applydebuff") {
        console.log(timeAt + ": " + debuffEdit[idx].ability.name + " & " + debuffEdit[idx+1].ability.name + " removed by " + debuffEdit[idx+2].ability.name + " & " + debuffEdit[idx+3].ability.name)
      }
      else 
        console.log(timeAt + ": Error, " + debuffEdit[idx].type + " " + debuffEdit[idx+1].type + " " + debuffEdit[idx+2].type + " " + debuffEdit[idx+3].type)
    }
    
    else if (count==5) {
      if (debuffEdit[idx].type == "removedebuff" && debuffEdit[idx+1].type == "removedebuff" && debuffEdit[idx+2].type == "applydebuff" && debuffEdit[idx+3].type == "removedebuff" && debuffEdit[idx+4].type == "applydebuff") {
        if (debuffEdit[idx].ability.name == debuffEdit[idx+2].ability.name)
          console.log(timeAt + ": " + debuffEdit[idx+1].ability.name + " removed by Phantom Debuff (" + debuffEdit[idx+2].ability.name + ")");
        else if (debuffEdit[idx+1].ability.name == debuffEdit[idx+2].ability.name)
          console.log(timeAt + ": " + debuffEdit[idx].ability.name + " removed by Phantom Debuff (" + debuffEdit[idx+2].ability.name + ")");
        else {
          console.log(timeAt + ": " + debuffEdit[idx].ability.name + " and " + debuffEdit[idx+1].ability.name + " removed by " + debuffEdit[idx+2].ability.name)}
        if (debuffEdit[idx+3].ability.name!==debuffEdit[idx+4].ability.name) {
          console.log(timeAt + ": " + debuffEdit[idx+3].ability.name + " removed by " + debuffEdit[idx+4].ability.name) }
        //else
          //Logger.log(timeAt + ": Error, " + debuffEdit[idx+3].type + " " + debuffEdit[idx+4].type)
      }
      else if (debuffEdit[idx].type == "removedebuff" && debuffEdit[idx+1].type == "applydebuff" && debuffEdit[idx+2].type == "applydebuff" && debuffEdit[idx+3].type == "removedebuff" && debuffEdit[idx+4].type == "applydebuff") {
        console.log(timeAt + ": " + debuffEdit[idx].ability.name + " removed by " + debuffEdit[idx+1].ability.name + " or " + debuffEdit[idx+2].ability.name)
        console.log(timeAt + ": " + debuffEdit[idx+3].ability.name + " removed by " + debuffEdit[idx+4].ability.name)
      }
      
      else if (debuffEdit[idx].type == "removedebuff" && debuffEdit[idx+1].type == "applydebuff" && debuffEdit[idx+2].type == "removedebuff" && debuffEdit[idx+3].type == "removedebuff" && debuffEdit[idx+4].type == "applydebuff") {
        console.log(timeAt + ": " + debuffEdit[idx].ability.name + " removed by " + debuffEdit[idx+1].ability.name)
        if (debuffEdit[idx+2].ability.name == debuffEdit[idx+4].ability.name)
          console.log(timeAt + ": " + debuffEdit[idx+3].ability.name + " removed by Phantom Debuff (" + debuffEdit[idx+4].ability.name + ")");
        else if (debuffEdit[idx+3].ability.name == debuffEdit[idx+4].ability.name)
          console.log(timeAt + ": " + debuffEdit[idx+2].ability.name + " removed by Phantom Debuff (" + debuffEdit[idx+4].ability.name + ")");
        else {
          console.log(timeAt + ": " + debuffEdit[idx+2].ability.name + " and " + debuffEdit[idx+3].ability.name + " removed by " + debuffEdit[idx+4].ability.name)}
      }
      
      else if (debuffEdit[idx].type == "removedebuff" && debuffEdit[idx+1].type == "applydebuff" && debuffEdit[idx+2].type == "removedebuff" && debuffEdit[idx+3].type == "applydebuff" && debuffEdit[idx+4].type == "applydebuff") {
        console.log(timeAt + ": " + debuffEdit[idx].ability.name + " removed by " + debuffEdit[idx+1].ability.name)
        console.log(timeAt + ": " + debuffEdit[idx+2].ability.name + " removed by " + debuffEdit[idx+3].ability.name + " or " + debuffEdit[idx+4].ability.name)
      }
      
      else 
        console.log(timeAt + ": Error, " + debuffEdit[idx].type + " " + debuffEdit[idx+1].type + " " + debuffEdit[idx+2].type + " " + debuffEdit[idx+3].type + " " + debuffEdit[idx+4].type)
    }
    
    else if (count==6) {
      if (debuffEdit[idx].type == "removedebuff" && debuffEdit[idx+1].type == "applydebuff" && debuffEdit[idx+2].type == "removedebuff" && debuffEdit[idx+3].type == "applydebuff" && debuffEdit[idx+4].type == "removedebuff" && debuffEdit[idx+5].type == "applydebuff") {
        if (debuffEdit[idx].ability.name!==debuffEdit[idx+1].ability.name) {
          console.log(timeAt + ": " + debuffEdit[idx].ability.name + " removed by " + debuffEdit[idx+1].ability.name)}
          
        if (debuffEdit[idx+2].ability.name!==debuffEdit[idx+3].ability.name) {
          console.log(timeAt + ": " + debuffEdit[idx+2].ability.name + " removed by " + debuffEdit[idx+3].ability.name)}
        
        if (debuffEdit[idx+4].ability.name!==debuffEdit[idx+5].ability.name) {
          console.log(timeAt + ": " + debuffEdit[idx+4].ability.name + " removed by " + debuffEdit[idx+5].ability.name)}
      }
      
      else
        console.log(timeAt + ": Error, " + debuffEdit[idx].type + " " + debuffEdit[idx+1].type + " " + debuffEdit[idx+2].type + " " + debuffEdit[idx+3].type + " " + debuffEdit[idx+4].type + " " + debuffEdit[idx+5].type)
      }
    else
       console.log(timeAt + ": " + count)
  }
  document.getElementById("page").innerHTML = output + "</table>";
  console.log(output)
}


function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}


function formatNumber(value) {
  console.log(value)
  value = value.toString();
  console.log(value)
  while (value.indexOf(".")<3) {
    value = " " + value;}
  while (value.length<7) {
    value += "0";}
  return value
}


/*function processInput() {

var input = document.querySelector("#input").value;
  
  
  
document.getElementById("page").innerHTML = input;
  
}*/
