// $("#threadbits_forum_2").children().each(function(){
// console.log("huehuehue")
// console.log($(this).children() > $("[id^=thread_title_]"))
// });

//DEPRECATED: Borrar codigo, Solo funciona en el general
// $("#collapseobj_st_2").before('<tbody id="collapseobj_st_3"> \
// </tbody> \
// ')

var palabras = []
var users = []
var hilos_ocultados = 0;
var id_foro = GetURLParameter('f');

chrome.storage.sync.get(['banwords', 'banusers', 'filtrar','options'], function(data) {
  console.log(data)
  if (Object.keys(data).length == 0){
    options = false
  }
  else{
    options = data["options"]
  }

  // if (data.banwords !== undefined){
  //   palabras = data["banwords"]
  // }
  // if(data.banusers !== undefined){
  //   users = data["banusers"]
  // }


    if (data["filtrar"][id_foro]["ocultar"]["banwords"] !== undefined){
      palabras = data["filtrar"][id_foro]["ocultar"]["banwords"]
    }
    if(data["filtrar"][id_foro]["ocultar"]["banusers"] !== undefined){
      users = data["filtrar"][id_foro]["ocultar"]["banusers"]
  }

  if (options["ocultar"] == true && $.inArray(id_foro, data["filtrar"]["options"]["foros_usados"]) !== -1){
    // var expreg = new RegExp("\\b("+palabras.join(")\\b|\\b(")+")\\b")
    // (?:\s|^)(cadena a comprobar)(?=\s|$)
    var expreg = new RegExp("(?:\\s|^)("+palabras.join(")(?=\\s|$)|(?:\\s|^)(")+")(?=\\s|$)")
    var expreg_users = new RegExp("(?:\\s|^)("+users.join(")(?=\\s|$)|(?:\\s|^)(")+")(?=\\s|$)")
    $("[id^=thread_title_]").each(function(){
      // console.log($(this).text())
      var texto = $(this).text().trim().toLowerCase()
      //console.log($(this).parent().next().text().trim())
      var user = $(this).parent().next().text().trim().toLowerCase()
      // console.log(palabras)
      // console.log(expreg)

      if (texto.match(expreg) != null || user.match(expreg_users) != null){
        if (options["ocultar"] == true || options["oscurecer"] == true){
          $(this).closest("tr").css("opacity" ,0.2)
        }
        //   $(this).closest("tr").hide()
        // }
        // else if (options["oscurecer"] == true){
        //   $(this).closest("tr").css("opacity" ,0.2)
        // }
        $("#collapseobj_st_3").append($(this).closest("tr"))
        hilos_ocultados++
        // console.log(hilos_ocultados)
      }
    });
    $("#collapseobj_st_3").append('<tr><td class="thead" colspan="6">&nbsp;</td></tr>')
    $(".cmega2").append("<br><span class='smallfont'>Se han ocultado "+hilos_ocultados+" hilos</span>")
  }
});

function GetURLParameter(sParam){
var sPageURL = window.location.search.substring(1);
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
