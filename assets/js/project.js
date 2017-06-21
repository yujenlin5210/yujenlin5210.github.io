function onProjectClick(url) {
    $('html').addClass('is-clipped');
    $("#project-modal").addClass("is-active");
    
    $("#project-modal-content").load(url);
}

function closeModal(id) {
    $('html').removeClass('is-clipped');
    $("#"+id).removeClass("is-active");
}