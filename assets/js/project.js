function onProjectClick(url) {
    $('html, body').addClass('is-clipped');
    $('html, body').addEventListener('touchmove', function(e) {
        e.preventDefault();
    }, false);
    
    $("#project-modal").addClass("is-active");
    
    $("#project-modal-content").load(url);
}

function closeModal(id) {
    $('html, body').removeClass('is-clipped');
    $('html, body').removeEventListener('touchmove');
    $("#"+id).removeClass("is-active");
}