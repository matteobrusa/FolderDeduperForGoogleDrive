'use strict';

// Client ID and API key from the Developer Console
var CLIENT_ID = '287517269304-0q2t78o2jb1qh6d9f5n9e938i46v5o1s.apps.googleusercontent.com';

// Array of API discovery doc URLs for APIs used by the quickstart
var DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
var SCOPES = 'https://www.googleapis.com/auth/drive';

var authorizeButton = document.getElementById('auth');
var signoutButton = document.getElementById('logout');
var authorizedArea = document.getElementById('authenticated');


var drivesource= {}
 
drivesource.init= function () {
    gapi.load('client:auth2', gd_initClient);
}

function gd_initClient() {
    gapi.client.init({
        discoveryDocs: DISCOVERY_DOCS,
        clientId: CLIENT_ID,
        scope: SCOPES
    }).then(function() {

      

        // Listen for sign-in state changes.
        gapi.auth2.getAuthInstance().isSignedIn.listen(gd_updateSigninStatus);

        // Handle the initial sign-in state.
        gd_updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
 
    });
}
 
function gd_updateSigninStatus(isSignedIn) {
   

    if (isSignedIn) {
        
        console.debug("authenticated.")
        init(); // handover
    } else 

    	{
        

        console.debug("not authenticated.")
         
        // trigger auth
        gapi.auth2.getAuthInstance().signIn();
 
    }
    
}

drivesource.logout= function() {
    gapi.auth2.getAuthInstance().signOut()
}
 
 

 

///////////////
//
// FILES
// 
///////////////

 
var isQuotaError= function(err) {
	return err.result.error.code= 403 && err.result.error.errors[0].reason== "userRateLimitExceeded"
}

 

drivesource.list= function ( folder ) {

    console.debug("listing files in "+ folder.name)

     var p= gapi.client.drive.files.list({
        'q': "trashed=false and '" + folder.id + "' in parents ",
        'pageSize': 1000,
        'fields': "nextPageToken, files(id, name, mimeType, size, md5Checksum, modifiedTime)"
    })


    return p.then(function(response) {
        	var files = response.result.files;
        	console.debug(files.length+ " in "+ folder.name)
			return files       
		}, 
		function (err) {
			console.error("error listing folder "+ folder.name)
			if (isQuotaError(err)) {
				return delayPromise(1000, function () { return drivesource.list(folder) })
		}
    })
}


 


 
 

drivesource.deleteFile= function(file) {
  
    return gapi.client.request({
      'path': 'https://www.googleapis.com/drive/v3/files/'+file.id,
      'method': 'DELETE'
    }).then(function(jsonResp) {
		if (jsonResp.status==200) {
			return file
		}
		else console.error(jsonResp)
    })
}

drivesource.thrashFile= function(file) {
 
    return gapi.client.request({
      'path': 'https://www.googleapis.com/drive/v3/files/'+file.id,
      'method': 'PATCH',
      'params': {'trashed':true}
    }).then(function(jsonResp) {
		if (jsonResp.status==200) {
			return file
		}
		else console.error(jsonResp)
    })
}


drivesource.moveFile= function(file, src, dst) {

	return gapi.client.request({
      'path': 'https://www.googleapis.com/drive/v3/files/'+file.id,
      'method': 'PATCH',
      'params': {"addParents": dst.id, "removeParents": src.id}
    }).then(function(jsonResp,rawResp) {
		if (jsonResp.status==200) {
			return file
		}
		else console.error(jsonResp)
    })
}


 


drivesource.createFolder= function (parent, name){

	var body= {"name": name, 
				"mimeType": "application/vnd.google-apps.folder",
				"parents": [parent.id]
				}
	
	return gapi.client.request({
      'path': 'https://www.googleapis.com/drive/v3/files/',
      'method': 'POST',
      'body': body
    }).then(function (res) {
    	return {id: res.result.id, name: name}
    })    
}

 