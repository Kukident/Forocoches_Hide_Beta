function parse_data(data, foro){
  var filtrar = {}
  if (data['filtrar'] !== undefined){
    filtrar = data['filtrar']

    if (data['filtrar']["options"] == undefined){
      filtrar["options"] = {}
    }
    else{
      if (filtrar["options"]["foros_usados"] == undefined){
        filtrar["options"]["foros_usados"] = ['2']
      }
      if (filtrar["options"]["active"] == undefined){
        filtrar["options"]["active"] = true
      }
    }

    if (data['filtrar'][foro] == undefined){
      filtrar[foro] = {}
      filtrar[foro]["ocultar"] = {}
      filtrar[foro]["ocultar"]["banwords"] = []
      filtrar[foro]["ocultar"]["banusers"] = []
    }
    else {
      if (data['filtrar'][foro]["ocultar"] == undefined){
        filtrar[foro]["ocultar"] = {}
        filtrar[foro]["ocultar"]["banwords"] = []
        filtrar[foro]["ocultar"]["banusers"] = []
      }
      else{

        if (data['filtrar'][foro]["ocultar"]["banwords"] == undefined){
          filtrar[foro]["ocultar"]["banwords"] = []
        }
        if(data['filtrar'][foro]["ocultar"]["banusers"] == undefined){
          filtrar[foro]["ocultar"]["banusers"] = []
        }
      }
    }
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
