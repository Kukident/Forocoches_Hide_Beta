// Check whether new version is installed
chrome.runtime.onInstalled.addListener(function(details){
  if(details.reason == "install"){
    console.log("This is a first install!");
  }else if(details.reason == "update"){
    var thisVersion = chrome.runtime.getManifest().version;
    console.log("Updated from " + details.previousVersion + " to " + thisVersion + "!");
    if (details.previousVersion !== thisVersion){
      console.log("Actualizamos la base de datos")
      chrome.storage.sync.get(['banwords', 'banusers'], function(data) {
        banwords = data["banwords"]
        banusers = data["banusers"]
        console.log(banwords)
        console.log(banusers)
        if (banwords !== undefined || banusers !== undefined){
          var datatosync = {}
          var filtrar = {}
          filtrar["2"] = {}
          filtrar["2"]["ocultar"] = {}
          filtrar["2"]["ocultar"]["banwords"] = banwords
          filtrar["2"]["ocultar"]["banusers"] = banusers
          datatosync["filtrar"] = filtrar
          chrome.storage.sync.set(datatosync, function() {
            // Notify that we saved.
            console.log("Guardado correctamente")
          })
        }
      });
    }
  }
});

chrome.runtime.onInstalled.addListener(function() {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
    chrome.declarativeContent.onPageChanged.addRules([
      {
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { urlContains: '.forocoches' },
          })
        ],
        actions: [ new chrome.declarativeContent.ShowPageAction() ]
      }
    ]);
  });
});

// TODO Activa o desactiva el icono de la extension fuera de forocoches, necesita el permiso tabs
// chrome.tabs.onUpdated.addListener(function(tabId, info, tab) {
//     var url = info.url || tab.url;
//     console.log(url)
//     if(url && url.indexOf('forocoches') > -1){
//       chrome.browserAction.enable()
//         console.log("siii")}
//     else{
//       chrome.browserAction.disable()
//         console.log("noo")}
// });

// TODO Añade el numero de hilos al icono de la extension
// chrome.runtime.onMessage.addListener(
//   function(request, sender, sendResponse) {
//     console.log(sender.tab ?
//                 "from a content script:" + sender.tab.url :
//                 "from the extension");
//                 console.log(request.hilos)
//                 chrome.browserAction.setBadgeText({text: request.hilos})
//   });
