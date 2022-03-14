//spinner
showSpinner(false);

function showSpinner(enable) {
    if (enable)
      document.getElementById('loader').style.display = 'block'
    else
      document.getElementById('loader').style.display = 'none'
  }

  /*
window.onmousemove = function(e) {
    
    if (e.target.id == "boundary") {
        console.log("hover")
    		//	Content of dot which is hovered
        var $target = e.target.nextElementSibling;
        //	Only work with hovered target
        //	Add visible class hovered elem to distinguish
        if (!$target.classList.contains('visible')) {
        		$target.classList.add('visible');
        } else {
            //	Get viewport offset of tooltip element
            var offset = $target.parentElement.getBoundingClientRect();
            //	Tooltip distance from mouse(px)
            var tipDist = 15;
            //	Calc and set new tooltip location
            $target.style.top = (e.clientY - offset.top + tipDist) + 'px';
            $target.style.left = (e.clientX - offset.left + tipDist) + 'px';
        }
    } else {
    		//	Remove visible class
        var content = document.getElementsByClassName('content');
        for (var i = 0; i < content.length; i++) {
        		content[i].classList.remove('visible');
        }
    }

};
*/