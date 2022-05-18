/**
 * パラメータから曲を参照
 */
function getSong(param) {
    return new URL(window.location.href).searchParams.get(param);
}

(function () {
    songData = document.createElement('script');
    songData.src = `songs/${getSong('n')}/${getSong('d')}.js`;
    document.head.appendChild(songData);
}());