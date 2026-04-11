var current_id = "";

function onProjectClick(url, id="project-modal") {
    current_id = id;
    showModal(url);
    history.pushState({
        action: 1,
        url: url,
        id: id
    }, $.trim(document.getElementsByTagName("title")[0].innerHTML), "#" + id);
}

function onCloseClick() {
    closeModal("project-modal");
    history.pushState({
        action: 0,
        id: current_id
    }, $.trim(document.getElementsByTagName("title")[0].innerHTML), window.location.pathname);
    current_id = "";
    // location.hash = "";
}

function showModal(url) {
    $('html').addClass('is-clipped');
    
    $("#project-modal").addClass("is-active");
    // $("#project-modal-content").css("overflow", "auto");
    
    $("#project-modal-content").load(url);
    
    // force redraw, fix bug on mac/safari
    setTimeout(function(){
        $('#project-modal').hide().show(0);
    }, 500);
}

function closeModal(id) {
    $('html').removeClass('is-clipped');
    // $('html, body').off('touchmove');
    $("#"+id).removeClass("is-active");
    $("#project-modal-content").empty();
    
}

var history_hash_change = false;

$(document).ready(function () {
    if (location.hash) {
        // alert(location.hash);
        $(location.hash).trigger("click");
    }
    window.onpopstate = function(event) {
        // alert("location: " + document.location + ", state: " + JSON.stringify(event.state));
        
        if (event.state === null) {
            closeModal("project-modal");
        } else if (event.state.action === 0) {
            closeModal("project-modal");
            history_hash_change = true;
        } else if (event.state.action === 1) {
            showModal(event.state.url);
            current_id = event.state.id;
            history_hash_change = true;

        }
    };
    window.onhashchange = function() {
        if (!history_hash_change) {
            $(location.hash).trigger("click");
        } else {
            history_hash_change = false;
        }
        // $(location.hash).trigger("click");
    }
});

