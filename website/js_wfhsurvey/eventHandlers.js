// When page finishes loading
document.addEventListener("DOMContentLoaded", function (){

    //// Voting / Company Registration Events

    var api = new surveyApi
    
    submitSurvey = function()
    {
        api.createCompany(document.getElementById('companyName').value, function(res){
            res ? true : alert('An error occurred, try again later')
        });

        if (document.getElementById('contactName').value && document.getElementById('contactEmail').value)
        {
            api.createContact(document.getElementById('companyName').value, document.getElementById('contactName').value, document.getElementById('contactEmail').value, function(res){
                res ? true : alert('An error occurred, try again later')
            });
        }

        voteOptionRadios = document.getElementsByName('voteOption')
        for (var i=0, length = voteOptionRadios.length; i < length; i++)
        {
            if (voteOptionRadios[i].checked)
            {
                voteOption = voteOptionRadios[i].value
                break;
            }
        }
        if (!getCookie('wfhsurvey_voted'))
        {
            api.vote(document.getElementById('companyName').value, voteOption, function(res){
                
                res ? true : alert('An error occurred, try again later')

                setCookie('wfhsurvey_voted','true',30);

                headers = document.getElementsByClassName('main_question')
                headers[headers.length-1].innerHTML = headers[headers.length-1].innerHTML.slice(0,-3) + document.getElementById('companyName').value

                document.getElementsByClassName('bar_wfh')[0].innerHTML = 'Work from home ('+res['vote_wfh']+' votes)'
                document.getElementsByClassName('bar_mix')[0].innerHTML = 'Combination ('+res['vote_mix']+' votes)'
                document.getElementsByClassName('bar_office')[0].innerHTML = 'Office ('+res['vote_office']+' votes)'

                newStyles = ".bar_wfh::after {max-width: "+Math.round(((res['vote_wfh']/res['votes'])*100))+"%;}\
                .bar_mix::after {max-width: "+Math.round(((res['vote_mix']/res['votes'])*100))+"%;}\
                .bar_office::after {max-width: "+Math.round(((res['vote_office']/res['votes'])*100))+"%;}"
                var styleElem = document.head.appendChild(document.createElement("style"));
                styleElem.innerHTML = newStyles;

                document.getElementById('socialButtons').style.display= 'flex'
                document.getElementById('covidApp').style.display= 'flex'
            });
        }
        else
        {
            headers = document.getElementsByClassName('main_question')
            headers[headers.length-1].innerHTML = 'Already voted'
            document.getElementsByClassName('summary')[0].innerHTML = '<p>You\'ve previously voted and cannot vote a second time, however, please consider sharing this site with your co-workers if you feel comfortable.</p><p>By sharing, you\'re helping others gain the flexibility they desire while <b><a href="#" data-toggle="modal" data-target="#advantages-txt">saving lives and the planet</a></b> at the same time!</p><p>In Canada? Did you know the official <a href="https://www.canada.ca/en/public-health/services/diseases/coronavirus-disease-covid-19/covid-alert.html" target="_blank">COVID Alert app</a> is heavily focused on <a href="https://www.canada.ca/en/public-health/services/diseases/coronavirus-disease-covid-19/covid-alert.html#a1" target="_blank">privacy</a>?  Consider installing it today! <strong>Wfh.vote is not associated with the Canadian government.</strong></p>';
            document.getElementById('socialButtons').style.display= 'flex'
            document.getElementById('covidApp').style.display= 'flex'
        }
    }

    document.getElementById("sendMessage").addEventListener("click", function(event)
    {
        event.preventDefault();

        // Disable button
        this.value = "Sending..."
        this.disabled;

        // Send form inputs
        api.sendMessage(document.getElementById('contactMessageEmail').value, document.getElementById('contactMessage').value, function(result){
            if (result)
            {
                this.value = "Message Sent!"
            }
            else
            {
                this.value = "An error occurred..."
            }
        });
    })

    //// Pop-up functionality for social media buttons
    ;(function($){
  
        /**
         * jQuery function to prevent default anchor event and take the href * and the title to make a share popup
         *
         * @param  {[object]} e           [Mouse event]
         * @param  {[integer]} intWidth   [Popup width defalut 500]
         * @param  {[integer]} intHeight  [Popup height defalut 400]
         * @param  {[boolean]} blnResize  [Is popup resizeabel default true]
         */
        $.fn.customerPopup = function (e, intWidth, intHeight, blnResize) {
          
          // Prevent default anchor event
          e.preventDefault();
          
          // Set values for window
          intWidth = intWidth || '500';
          intHeight = intHeight || '600';
          strResize = (blnResize ? 'yes' : 'no');
      
          // Set title and open popup with focus on it
          var strTitle = ((typeof this.attr('title') !== 'undefined') ? this.attr('title') : 'Social Share'),
              strParam = 'width=' + intWidth + ',height=' + intHeight + ',resizable=' + strResize,            
              objWindow = window.open(this.attr('href'), strTitle, strParam).focus();
        }
        
        /* ================================================== */
        
        $(document).ready(function ($) {
          $('.socialButton').on("click", function(e) {
            $(this).customerPopup(e);
          });
        });
          
      }(jQuery));

    //// Company Name Autocomplete Events

    var autocompleteInput = document.getElementById('companyName')
    var autocompleteCurrentFocus
    var companies = null
    ajax('https://'+window._config.apiEndpoint.split('/')[2]+'/companies.json', 'GET', function(ajaxResult){
        companies = ajaxResult['Companies']
    });

    // Render the autocomplete drowndown list
    autocompleteInput.addEventListener("input", function(e){
        var a, b, i, val = this.value
        
        closeAllLists(e.target)
        // If the field is empty, don't bother showing any suggestions
        if (!val) { return false }
        autocompleteCurrentFocus = -1

        // Don't bother drawing the list if we haven't finished retrieving the company names
        if (companies != null)
        {
            // Create a div that will contain the company name suggestions
            a = document.createElement("DIV")
            a.setAttribute("id", this.id + "autocomplete-list")
            a.setAttribute("class", "autocomplete-items")
            this.parentNode.appendChild(a)

            /*for each item in the array...*/
            for (i = 0; i < companies.length; i++) {
                /*check if the item starts with the same letters as the text field value:*/
                if (companies[i].substr(0, val.length).toUpperCase() == val.toUpperCase()) {
                    /*create a DIV element for each matching element:*/
                    b = document.createElement("DIV");
                    /*make the matching letters bold:*/
                    b.innerHTML = "<strong>" + companies[i].substr(0, val.length) + "</strong>";
                    b.innerHTML += companies[i].substr(val.length);
                    /*insert a input field that will hold the current array item's value:*/
                    b.innerHTML += "<input type='hidden' value='" + companies[i] + "'>";
                    /*execute a function when someone clicks on the item value (DIV element):*/
                    b.addEventListener("click", function(e) {
                        /*insert the value for the autocomplete text field:*/
                        autocompleteInput.value = this.getElementsByTagName("input")[0].value;
                        /*close the list of autocompleted values,
                        (or any other open lists of autocompleted values:*/
                        closeAllLists(e.target);
                    });
                    a.appendChild(b);
                }
            }
        }
    });

    // Keyboard navigation of the autocomplete dropdown list
    autocompleteInput.addEventListener("keydown", function(e){
        var x = document.getElementById(this.id + "autocomplete-list");
        if (x) x = x.getElementsByTagName("div");
        if (e.keyCode == 40) {
            /*If the arrow DOWN key is pressed,
            increase the currentFocus variable:*/
            autocompleteCurrentFocus++;
            /*and and make the current item more visible:*/
            addActive(x);
        } else if (e.keyCode == 38) { //up
            /*If the arrow UP key is pressed,
            decrease the currentFocus variable:*/
            autocompleteCurrentFocus--;
            /*and and make the current item more visible:*/
            addActive(x);
        } else if (e.keyCode == 13) {
            /*If the ENTER key is pressed, prevent the form from being submitted,*/
            e.preventDefault();
            if (autocompleteCurrentFocus > -1) {
            /*and simulate a click on the "active" item:*/
            if (x) x[autocompleteCurrentFocus].click();
            }
        }
    });

    // Close autocomplete lists, with exception to the one clicked on (if it was an autocomplete list)
    document.addEventListener("click", function (e) {
        closeAllLists(e.target)
    })

    // Helper functions for autocomplete list
    function addActive(x) {
        /*a function to classify an item as "active":*/
        if (!x) return false;
        /*start by removing the "active" class on all items:*/
        removeActive(x);
        if (autocompleteCurrentFocus >= x.length) autocompleteCurrentFocus = 0;
        if (autocompleteCurrentFocus < 0) autocompleteCurrentFocus = (x.length - 1);
        /*add class "autocomplete-active":*/
        x[autocompleteCurrentFocus].classList.add("autocomplete-active");
    }

      function removeActive(x) {
        /*a function to remove the "active" class from all autocomplete items:*/
        for (var i = 0; i < x.length; i++) {
          x[i].classList.remove("autocomplete-active");
        }
      }

      function closeAllLists(elmnt) {
        var x = document.getElementsByClassName("autocomplete-items");
        for (var i = 0; i < x.length; i++) {
            if (elmnt.target != x[i] && elmnt.target != autocompleteInput) {
                x[i].parentNode.removeChild(x[i]);
            }
        }
      }

    //// Bar Graph for Results

    // Helper functions for bar graph
    
    function drawLine(ctx, startX, startY, endX, endY,color){
        ctx.save();
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(startX,startY);
        ctx.lineTo(endX,endY);
        ctx.stroke();
        ctx.restore();
    }
     
    function drawBar(ctx, upperLeftCornerX, upperLeftCornerY, width, height,color){
        ctx.save();
        ctx.fillStyle=color;
        ctx.fillRect(upperLeftCornerX,upperLeftCornerY,width,height);
        ctx.restore();
    }

    var Barchart = function(options){
        this.options = options;
        this.canvas = options.canvas;
        this.ctx = this.canvas.getContext("2d");
        this.colors = options.colors;
      
        this.draw = function(){
            var maxValue = 0;
            for (var categ in this.options.data){
                maxValue = Math.max(maxValue,this.options.data[categ]);
            }
            var canvasActualHeight = this.canvas.height - this.options.padding * 2;
            var canvasActualWidth = this.canvas.width - this.options.padding * 2;
     
            //drawing the grid lines
            var gridValue = 0;
            while (gridValue <= maxValue){
                var gridY = canvasActualHeight * (1 - gridValue/maxValue) + this.options.padding;
                drawLine(
                    this.ctx,
                    0,
                    gridY,
                    this.canvas.width,
                    gridY,
                    this.options.gridColor
                );
                 
                //writing grid markers
                this.ctx.save();
                this.ctx.fillStyle = this.options.gridColor;
                this.ctx.textBaseline="bottom"; 
                this.ctx.font = "bold 10px Arial";
                this.ctx.fillText(gridValue, 10,gridY - 2);
                this.ctx.restore();
     
                gridValue+=this.options.gridScale;
            }      
      
            //drawing the bars
            var barIndex = 0;
            var numberOfBars = Object.keys(this.options.data).length;
            var barSize = (canvasActualWidth)/numberOfBars;
     
            for (categ in this.options.data){
                var val = this.options.data[categ];
                var barHeight = Math.round( canvasActualHeight * val/maxValue) ;
                drawBar(
                    this.ctx,
                    this.options.padding + barIndex * barSize,
                    this.canvas.height - barHeight - this.options.padding,
                    barSize,
                    barHeight,
                    this.colors[barIndex%this.colors.length]
                );
     
                barIndex++;
            }
     
            //drawing series name
            this.ctx.save();
            this.ctx.textBaseline="bottom";
            this.ctx.textAlign="center";
            this.ctx.fillStyle = "#000000";
            this.ctx.font = "bold 14px Arial";
            this.ctx.fillText(this.options.seriesName, this.canvas.width/2,this.canvas.height);
            this.ctx.restore();  
             
            //draw legend
            barIndex = 0;
            var legend = document.querySelector("legend[for='myCanvas']");
            var ul = document.createElement("ul");
            legend.append(ul);
            for (categ in this.options.data){
                var li = document.createElement("li");
                li.style.listStyle = "none";
                li.style.borderLeft = "20px solid "+this.colors[barIndex%this.colors.length];
                li.style.padding = "5px";
                li.textContent = categ;
                ul.append(li);
                barIndex++;
            }
        }
    }

});


//// Local helper functions
ajax = function(uri, method, callback, data)
{
    var xhr = new XMLHttpRequest()
    xhr.open(method, uri, true)

    xhr.onreadystatechange = function()
    {
        if (this.readyState == 4 && ([200, 304].indexOf(this.status) !== -1))
        {
            try {
                response = JSON.parse(this.responseText);
            } catch (e) {
                response = this.responseText
            }

            // Get the raw header string
            var headers = this.getAllResponseHeaders();

            // Convert the header string into an array
            // of individual headers
            var arr = headers.trim().split(/[\r\n]+/);
        
            // Create a map of header names to values
            var headerMap = {};
            arr.forEach(function (line) {
                var parts = line.split(': ');
                var header = parts.shift().toLowerCase();
                var value = parts.join(': ').toLowerCase();
                headerMap[header] = value;
            });

            callback(response, headerMap);
        }
        else if (this.readyState == 4 && this.status != 200)
        {
            // Request failed, return failure.
            callback(false)
        }
    }

    xhr.send();
}

function setCookie(name,value,days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}