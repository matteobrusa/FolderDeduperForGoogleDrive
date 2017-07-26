var dryRun= false
var foldersToMerge= []
var INFO= "info", WARN="warn"
var root= {id:"root", name: "root"}

$("a").click(drivesource.logout)

drivesource.init()

var trashFolder

function init() {



 
		return scan (root).then(function() {
			log("Scan done, merging "+foldersToMerge.length + " folders", WARN)
			promiseEach(foldersToMerge, mergeFolders).then(function () {
				log("Merge done.", WARN)
			})
		})

    
}    




function scan(folder) {

    log("scanning "+ folder.name, INFO)
    return drivesource.list(folder).then(function (entries) {

        var folders=new Map() 
 
        for (var i=0; i<entries.length; i++) {

            var entry= entries[i]

            if (entry.mimeType== "application/vnd.google-apps.folder") {
                var dupe= folders.get(entry.name)
                if ( dupe == undefined ) {
                    folders.set(entry.name, entry)
                } 
                else { // Duplicate!!

                	dupe.parent= folder // set the parent for final deletion
					foldersToMerge.push([dupe, entry])
                	log("Duplicated folders: "+ dupe.name + " in "+ folder.name, "warn")
                	folders.delete(entry.name)
 //                   mergeFolders(dupe, entry)
                }
            }
        }

		var res=  promiseEach(folders, scan)

		if ( folder==root ) {
			trashFolder= folders.get("trash")

		 if ( trashFolder==undefined )
			res= drivesource.createFolder(root, "trash").then(function (folder) {
				trashFolder= folder
			}).then(res)
		}

        return res 
    })
}

function mergeFolders(pair){

	var src= pair[0], dst=pair[1]
  
    log("merging "+ src.name, INFO)

 	return Promise.all([
        drivesource.list(src),
        drivesource.list(dst) 
    ]).then(function (res){
        
        var srcFiles= res[0]
        var dstFiles= fileArrayToMap(res[1])
        
        log("iterating in " + src.name)

        return promiseEach(srcFiles, function(file){
         
            

            var dupe= dstFiles.get(file.name)



            if (dupe) {

				if (file.mimeType=="application/vnd.google-apps.folder" && dupe.mimeType=="application/vnd.google-apps.folder") {
					
					file.parent= src
					return mergeFolders([file, dupe])
				}
				else
                if (file.size==dupe.size && file.md5Checksum==dupe.md5Checksum){
                    log ("file "+ src.name+"/"+ file.name + " is the same in both folders, removing dupe "+ file.id)
                    if (!dryRun) {
//                         return drivesource.thrashFile(file).then(function(res) {
//                             log("deleted "+res.name)
//                         })

						return drivesource.moveFile(file, src, trashFolder).then(function(res) {
							log("moved to thrash folder "+res.name)
						})
                    }
                }
                else{
                    log ("file "+ file.name + " is the different in both folders. What now?")
                }
                
            }
            else { // not there, move it 
                log("moving file " + file.name)
                if (!dryRun) 
                    return drivesource.moveFile(file, src, dst).then(function(res) {
                        log("moved "+res.name)
                    })
            }
        }).then(function () { // remove src folder 
						log("deleting folder " + src.name)
						if (!dryRun) { 
				// 			return drivesource.thrashFile(src).then(function(res) {
				// 				log("deleted folder "+src.name)
				// 			})
							return drivesource.moveFile(src, src.parent, trashFolder).then(function(res) {
								log("moved to thrash folder "+src.name)
							})
						}

					})
    })
}



//////////////////////////
//
// toolbox
// 
//////////////////////////

function fileArrayToMap(arr){
    var res= new Map()
    for (var i=0; i<arr.length; i++) {
        res.set(arr[i].name, arr[i])
    }

    return res
}
 


var debugDiv= $("#log")
var bo= $("body")[0]

function log(msg, level) {
	if (level==undefined)
		level= "debug"
    debugDiv.append("<p class='"+level+"'>"+msg+"</p>")
    bo.scrollTop = bo.scrollHeight
}

function  promiseEach(items, fn) {
 

	var sequence= Promise.resolve()
 
 
	items.forEach(function (item) {
		 
 		sequence= sequence.then(function() {
			return fn(item)
		})
	})

	return sequence
}

function delayPromise(delay, res) {  

    return new Promise(function(resolve, reject) {
        setTimeout(function() {
            resolve(res)
        }, delay)
    })
}