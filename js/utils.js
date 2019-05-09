/** Junta en un unico array los diferentes arrays que contienen palabras*/
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

/** Separa en diferentes arrays el array original que contiene las palabras a almacenar */
function split_data(string_palabras, foro, form, max_size_array = []) {
  let json_test = {["f_" + foro + "_" + form + "_0"]: string_palabras}
  let excess_words = []
  while (lengthInUtf8Bytes(JSON.stringify(json_test)) >= 8000) {
    excess_words.unshift(string_palabras.pop())
  }
  excess_words_json = {["f_" + foro + "_" + form + "_0"]: excess_words}
  max_size_array.push(string_palabras)
  if (lengthInUtf8Bytes(JSON.stringify(excess_words_json)) >= 8000){
    max_size_array = split_data(excess_words, foro, form, max_size_array)
  }
  else if (excess_words.length !== 0){
    max_size_array.push(excess_words)
  }
  return max_size_array
}

/** Guarda en la BD las nuevas palabras*/
function save_words(datatosync, string_palabras, foro, form){
  let splited_words_array = split_data(string_palabras, foro, form)
  console.debug("Se van a guardar las palabras en " + splited_words_array.length + " keys de la BD")
  splited_words_array.forEach((array_data, index) =>{
    let name = "f_" + foro + "_" + form + "_" + index
    datatosync[name] = array_data
  })

  chrome.storage.sync.set(datatosync, function() {
    // Notify that we saved.
    let btn_class = ""
    if(chrome.runtime.lastError){
      console.debug(chrome.runtime.lastError.message)
      btn_class = "btn-danger"
    }
    else{
      console.debug("Guardado correctamente")
      btn_class = "btn-success"
      chrome.storage.sync.get(null, function(data) {
        keys = Object.keys(data)
        keys_to_remove = []
        keys.forEach((key) => {
          if (key.includes("f_" + foro + "_" + form + "_") && !datatosync[key]){
            keys_to_remove.push(key)
          }
        })
        console.debug("Keys to remove:")
        console.debug(keys_to_remove)
        chrome.storage.sync.remove(keys_to_remove)
      });
    }
    button.addClass(btn_class + " btn-raised")
    setTimeout(function(){
      button.removeClass(btn_class + " btn-raised")
    }, 1000);
  });
}

/** Genera la estructura basica si esta no existe cuando la obtenemos de la BD*/
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
  }
  else{
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
