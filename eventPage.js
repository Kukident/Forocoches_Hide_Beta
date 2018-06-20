// Check whether new version is installed
chrome.runtime.onInstalled.addListener(function(details){
  if(details.reason == "install"){
    console.log("This is a first install!");
  }else if(details.reason == "update"){
    var thisVersion = chrome.runtime.getManifest().version;
    console.log("Updated from " + details.previousVersion + " to " + thisVersion + "!");
    if (details.previousVersion !== thisVersion){
      console.log("Actualizamos la base de datos")
      chrome.storage.sync.get(null, function(data) {
        console.log(data["filtrar"])
        for (var foro in data["filtrar"]){
          console.log(foro)
          if ("ocultar" in data["filtrar"][foro]){
            if ("banwords" in data["filtrar"][foro]["ocultar"]){
              console.log("Copiamos palabras del foro " + foro)
              data["f_" + foro + "_banwords_0"] = data["filtrar"][foro]["ocultar"]["banwords"]
            }
            if ("banusers" in data["filtrar"][foro]["ocultar"]){
              console.log("Copiamos usuarios del foro " + foro)
              data["f_" + foro + "_banusers_0"] = data["filtrar"][foro]["ocultar"]["banusers"]
            }
          }
        }
        console.log(data);
        chrome.storage.sync.set(data, function() {
          if(chrome.runtime.lastError){
            console.log(chrome.runtime.lastError.message)
          }
          else{
            console.log("Actualización de la base de datos realizada correctamente")
          }
        });
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
