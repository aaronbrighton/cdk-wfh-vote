function surveyApi()
{
    //// Properties
    apiUrl = window._config.apiEndpoint

    //// External functions

    // Creates a new company
    this.createCompany = function(companyName, callback)
    {
        data = {
            name: companyName
        }

        this.api('companies', 'PUT', JSON.stringify(data), function (apiResult){
            callback(apiResult ? true : false)
        });
    }

    // Creates (or updates) the vote entry for a company
    this.vote = function(companyName, voteOption, callback, exists)
    {
        if (exists === undefined){exists=false}

        data = {
            company_name: companyName
        }

        data[voteOption] = 1

        if (!exists)
        {
            // We attempt to create the company's vote entry if it didn't exist when the page was loaded, if this fails, we do an update instead
            this.api('votes', 'PUT', JSON.stringify(data), function (apiResult){
                
                if (apiResult)
                {
                    var pseudoApiResult = {
                        company_name: companyName,
                        vote_wfh: (voteOption == 'vote_wfh') ? 1 : 0,
                        vote_mix: (voteOption == 'vote_mix') ? 1 : 0,
                        vote_office: (voteOption == 'vote_office') ? 1 : 0,
                        votes: 1
                    }
                    callback(pseudoApiResult)
                }
                else
                {
                    // Dirty, but it works.
                    var localApi = new surveyApi
                    localApi.voteForExistingCompany(data, callback)
                }
                
            });
        }
        else
        {
            this.voteForExistingCompany(data, callback)
        }
    }

    // Adds a contact for a given company
    this.createContact = function(companyName, name, emailAddress, callback)
    {
        data = {
            company_name: companyName,
            name: name,
            email_address: emailAddress
        }

        this.api('contacts', 'PUT', JSON.stringify(data), function (apiResult){
            callback(apiResult ? true : false)
        });
    }

    //// Internal functions

    this.voteForExistingCompany = function(data, callback)
    {
        this.api('votes', 'POST', JSON.stringify(data), function (apiResult){
            apiResult ? callback(apiResult) : callback(false)
        });
    }

    this.sendMessage = function(email, message, callback)
    {
        data = {
            from_email: email,
            message: message
        }

        this.api('message', 'PUT', JSON.stringify(data), function (apiResult){
            callback(apiResult ? true : false)
        });
    }

    this.api = function(resource, method, data, callback)
    {
        var xhr = new XMLHttpRequest()
        xhr.open(method, apiUrl+'/'+resource, true)
        xhr.setRequestHeader("Content-Type", "application/json");

        xhr.onreadystatechange = function()
        {
            if (this.readyState == 4 && (this.status == 200))
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

        xhr.send(data);
    }
}