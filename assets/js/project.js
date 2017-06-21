function onProjectClick(url) {
    // window.scrollTo(0,1);
    $('html').addClass('is-clipped');
    // $('html, body').on('touchmove', function(e) {
    //     e.preventDefault();
        
    // }, false);
    
    $("#project-modal").addClass("is-active");
    
    $("#project-modal-content").load(url);
}

function closeModal(id) {
    $('html').removeClass('is-clipped');
    // $('html, body').off('touchmove');
    $("#"+id).removeClass("is-active");
}