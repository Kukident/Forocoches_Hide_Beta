function get_filtrar(data, foro){
  var banwords = []
  var banusers = []

  keys = Object.keys(data)
  keys.forEach((key) => {
    if (key.includes("f_" + foro + "_" + "banwords_")){
      banwords = banwords.concat(data[key])
    }
    if (key.includes("f_" + foro + "_" + "banusers_")){
      banusers = banusers.concat(data[key])
    }
  })
  banwords.sort()
  banusers.sort()
  return {"banwords" : banwords, "banusers": banusers}
}

function save_words(datatosync, string_palabras, foro, form){
  let json_test = {form: string_palabras}
  let i = 1
  let tmp_array = []
  let tmp_array2 = []

  while (lengthInUtf8Bytes(JSON.stringify(json_test)) >= 8000){
    tmp_array.unshift(string_palabras.pop())
    let json_test2 = {form: tmp_array}
    if (lengthInUtf8Bytes(JSON.stringify(json_test2)) >= 8000){
      tmp_array2 = []
      // while(lengthInUtf8Bytes(JSON.stringify(json_test2)) >= 8000){
      tmp_array2.unshift(tmp_array.pop())
      json_test2 = {form: tmp_array}
      // }
      let name = "f_" + foro + "_" + form + "_" + i
      let name1 = "f_" + foro + "_" + form + "_" + (i+1)
      datatosync[name] = tmp_array
      datatosync[name1] = tmp_array2
      tmp_array = []
      i += 1
    }
  }
  let name0 = "f_" + foro + "_" + form + "_" + "0"
  let namen = "f_" + foro + "_" + form + "_" + i
  datatosync[name0] = string_palabras

  if (tmp_array.length !== 0 && datatosync[namen]){
    datatosync[namen] = datatosync[namen].concat(tmp_array)
  }
  if (tmp_array2.length !== 0 && datatosync[namen]){
    datatosync[namen] = datatosync[namen].concat(tmp_array2)
  }

  chrome.storage.sync.set(datatosync, function() {
    // Notify that we saved.
    let btn_class = ""
    if(chrome.runtime.lastError){
      console.log(chrome.runtime.lastError.message)
      btn_class = "btn-danger"
    }
    else{
      console.log("Guardado correctamente")
      btn_class = "btn-success"
      chrome.storage.sync.get(null, function(data) {
        keys = Object.keys(data)
        keys_to_remove = []
        keys.forEach((key) => {
          console.log(key)
          if (key.includes("f_" + foro + "_" + form + "_") && !datatosync[key]){
            keys_to_remove.push(key)
          }
        })
        chrome.storage.sync.remove(keys_to_remove)
      });
    }
    button.addClass(btn_class + " btn-raised")
    setTimeout(function(){
      button.removeClass(btn_class + " btn-raised")
    }, 1000);
  });
}

function parse_data(data, foro){
  var filtrar = {}
  if (data['filtrar'] !== undefined){
    filtrar = data['filtrar']

    if (data['filtrar']["options"] == undefined){
      filtrar["options"] = {}
      filtrar["options"]["foros_usados"] = ['2']
      filtrar["options"]["active"] = true
    }
    else{
      if (filtrar["options"]["foros_usados"] == undefined){
        filtrar["options"]["foros_usados"] = ['2']
      }
      if (filtrar["options"]["active"] == undefined){
        filtrar["options"]["active"] = true
      }
    }

    // if (data['filtrar'][foro] == undefined){
    //   filtrar[foro] = {}
    //   filtrar[foro]["ocultar"] = {}
    //   filtrar[foro]["ocultar"]["banwords"] = []
    //   filtrar[foro]["ocultar"]["banusers"] = []
    // }
    // else {
    //   if (data['filtrar'][foro]["ocultar"] == undefined){
    //     filtrar[foro]["ocultar"] = {}
    //     filtrar[foro]["ocultar"]["banwords"] = []
    //     filtrar[foro]["ocultar"]["banusers"] = []
    //   }
    //   else{
    //
    //     if (data['filtrar'][foro]["ocultar"]["banwords"] == undefined){
    //       filtrar[foro]["ocultar"]["banwords"] = []
    //     }
    //     if(data['filtrar'][foro]["ocultar"]["banusers"] == undefined){
    //       filtrar[foro]["ocultar"]["banusers"] = []
    //     }
    //   }
    // }
  }
  else{
    filtrar[foro] = {}
    filtrar[foro]["ocultar"] = {}
    filtrar[foro]["ocultar"]["banwords"] = []
    filtrar[foro]["ocultar"]["banusers"] = []
    filtrar["options"] = {}
    filtrar["options"]["foros_usados"] = ['2']
    filtrar["options"]["active"] = true
  }
  return filtrar
}

function GetURLParameter(url, sParam){
  var url_element = document.createElement('a');
  url_element.href = url
  var sPageURL = url_element.search.substring(1);
  var sURLVariables = sPageURL.split('&');
  for (var i = 0; i < sURLVariables.length; i++)
  {
    var sParameterName = sURLVariables[i].split('=');
    if (sParameterName[0] == sParam)
    {
      return sParameterName[1];
    }
  }
}

function lengthInUtf8Bytes(str) {
  // Matches only the 10.. bytes that are non-initial characters in a multi-byte sequence.
  var m = encodeURIComponent(str).match(/%[89ABab]/g);
  return str.length + (m ? m.length : 0);
}

function escapeRegExp(text) {
  return text.replace(/[-[\]{}()*+?.\\^$|#\s]/g, '\\$&');
}

var foros = {
  "2": ["General"],
  "17": ["Electrónica / Informática"],
  "82": ["Fotografía", 17],
  "23": ["Empleo"],
  "64": ["Taxi", 23],
  "27": ["Viajes"],
  "15": ["Quedadas (KDD)"],
  "4": ["ForoCoches"],
  "18": ["Competición"],
  "20": ["Clásicos"],
  "65": ["Compra - Venta Clasicos", 20],
  "47": ["Monovolumentes"],
  "21": ["4x4 / Ocio"],
  "79": ["Compra - Venta 4x4 / Ocio", 21],
  "28": ["Modelismo"],
  "70": ["Compra - Venta Modelismo", 28],
  "76": ["Camiones / Furgones / Autobuses"],
  "48": ["Motos"],
  "80": ["Compra - Venta Motos", 48],
  "19": ["Mecánica"],
  "5": ["Car-Audio"],
  "31": ["Seguros"],
  "87": ["Promos Seguros", 31],
  "30": ["Tráfico / Radares"],
  "6": ["Tuning"],
  "16": ["Juegos de Coches"],
  "43": ["Juegos Online"],
  "85": ["Plan PIVE"],
  "34": ["Compra - Venta Profesional"],
  "11": ["Compra - Venta Motor"],
  "25": ["Compra - Venta Audio / Tuning"],
  "22": ["Compra - Venta Electrónica"],
  "69": ["Compra - Venta General"],
  "12": ["Info / Ayuda"],
  "8": ["Ayuda"]
}
