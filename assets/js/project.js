var current_id = "";

function onProjectClick(url, id="project-modal") {
    current_id = id;
    showModal(url);
    history.pushState({
        action: 1,
        url: url,
        id: id
    }, document.getElementsByTagName("title")[0].innerHTML, "#noback");
}

function onCloseClick() {
    closeModal(current_id);
    history.pushState({
        action: 0,
        id: current_id
    }, document.getElementsByTagName("title")[0].innerHTML, "");
    current_id = "";
    
}

function showModal(url) {
    // window.scrollTo(0,1);
    $('html').addClass('is-clipped');
    // $('html, body').on('touchmove', function(e) {
    //     e.preventDefault();
        
    // }, false);
    
    $("#project-modal").addClass("is-active");
    // $("#project-modal-content").css("overflow", "auto");
    
    $("#project-modal-content").load(url);
}

function closeModal(id) {
    $('html').removeClass('is-clipped');
    // $('html, body').off('touchmove');
    $("#"+id).removeClass("is-active");
    // $("#project-modal-content").css("overflow", "hidden");
}

$(document).ready(function () {
    window.onpopstate = function(event) {
        // alert("location: " + document.location + ", state: " + JSON.stringify(event.state));
        if (event.state === null) {
            closeModal("project-modal");
        } else if (event.state.action === 0) {
            closeModal(event.state.id);
        } else if (event.state.action === 1) {
            showModal(event.state.url);
            current_id = event.state.id;
        }
    };
});

