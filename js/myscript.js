//DEPRECATED: Borrar codigo, Solo funciona en el general
// $("#collapseobj_st_2").before('<tbody id="collapseobj_st_3"> \
// </tbody> \
// ')

var palabras = []
var users = []
var ocultar = false
var hilos_ocultados = 0;
var id_foro = GetURLParameter(window.location, 'f');

chrome.storage.sync.get(['banwords', 'banusers', 'filtrar','options'], function(data) {
  console.log(data)

  filtrar = parse_data(data, id_foro)
  console.log(filtrar)
  palabras = filtrar[id_foro]["ocultar"]["banwords"]
  users = filtrar[id_foro]["ocultar"]["banusers"]
  ocultar = filtrar["options"]["active"]

  if (ocultar == true && $.inArray(id_foro, filtrar["options"]["foros_usados"]) !== -1){
    // var expreg = new RegExp("\\b("+palabras.join(")\\b|\\b(")+")\\b")
    // (?:\s|^)(cadena a comprobar)(?=\s|$)

    // Creamos las variables con una expresion regular por defecto, ya que si no a veces ocultaba hilos debido a espacios ocultos
    var expreg = new RegExp("^((?!()).)*$")
    var expreg_users = new RegExp("^((?!()).)*$")
    if (palabras.length !== 0){
      expreg = new RegExp("(?:\\s|^)("+palabras.join(")(?=\\s|$)|(?:\\s|^)(")+")(?=\\s|$)")
    }
    if (users.length !== 0){
      expreg_users = new RegExp("(?:\\s|^)("+users.join(")(?=\\s|$)|(?:\\s|^)(")+")(?=\\s|$)")
    }

    $("[id^=thread_title_]").each(function(){
      // console.log($(this).text())
      var texto = $(this).text().trim().toLowerCase()
      //console.log($(this).parent().next().text().trim())
      var user = $(this).parent().next().text().trim().toLowerCase()
      // console.log(palabras)
      // console.log(expreg)

      if (texto.match(expreg) != null || user.match(expreg_users) != null){
        if (ocultar == true){
          $(this).closest("tr").css("opacity" ,0.2)
        }

        $("#collapseobj_st_3").append($(this).closest("tr"))
        hilos_ocultados++
      }
    });
    $("#collapseobj_st_3").append('<tr><td class="thead" colspan="6">&nbsp;</td></tr>')
    $(".cmega2").append("<br><span class='smallfont'>Se han ocultado "+hilos_ocultados+" hilos</span>")

    // TODO Añade el numero de hilos al icono de la extension
    // chrome.runtime.sendMessage({hilos: hilos_ocultados.toString()}, function(response) {
    //   console.log(response);
    // });

  }
});


//////////////////////Inicio crear interfaz\\\\\\\\\\\\\\\\\\\\\\\\\\\\º
$("#threadslist").children().first().after('<tbody id="collapseobj_st_3"> \
</tbody> \
')
//TODO: Optimizar codigo
console.log($("#stickies_collapse"))
if ($("#stickies_collapse").length){
  $("#stickies_collapse").before('<td class="vbmenu_control" id="hide_collapse" nowrap="nowrap"> \
  <a href=""> \
  Hilos Ocultos \
  <img id="collapseimg_st_3" src="//st.forocoches.com/foro/images/buttons/collapse_tcat_collapsed.gif" alt="" border="0" hspace="3"> \
  </a> \
  </td>')
}
else {
  $("#forumtools").before('<td class="vbmenu_control" id="hide_collapse" nowrap="nowrap"> \
  <a href=""> \
  Hilos Ocultos \
  <img id="collapseimg_st_3" src="//st.forocoches.com/foro/images/buttons/collapse_tcat_collapsed.gif" alt="" border="0" hspace="3"> \
  </a> \
  </td>')
}
$("#collapseobj_st_3").hide()
// $("#collapseobj_st_3").append('<tr><td class="thead" colspan="6">&nbsp;</td></tr>')

$("#hide_collapse").on('click', function(e) {
  e.preventDefault();
  if ($("#collapseobj_st_3").is(":visible")){
    $("#collapseimg_st_3").replaceWith('<img id="collapseimg_st_3" src="//st.forocoches.com/foro/images/buttons/collapse_tcat_collapsed.gif" alt="" border="0" hspace="3">')
    $("#collapseobj_st_3").hide()
  }
  else {
    $("#collapseimg_st_3").replaceWith('<img id="collapseimg_st_3" src="//st.forocoches.com/foro/images/buttons/collapse_tcat.gif" alt="" border="0" hspace="3">')
    $("#collapseobj_st_3").show()
  }
});
//////////////////////Fin crear interfaz\\\\\\\\\\\\\\\\\\\\\\\\\\\\
