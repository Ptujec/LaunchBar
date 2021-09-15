/* Filter files in a folder by type
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-file
- https://itectec.com/superuser/osx-assign-extension-to-content-kind/
- https://developer.apple.com/library/archive/documentation/FileManagement/Conceptual/understanding_utis/understand_utis_conc/understand_utis_conc.html
- https://eclecticlight.co/2018/01/24/file-types-the-uti-and-even-more-metadata/
- https://en.wikipedia.org/wiki/Uniform_Type_Identifier
- https://escapetech.eu/manuals/qdrop/uti.html
- https://apple.stackexchange.com/a/175395
- https://en.wikipedia.org/wiki/Uniform_Type_Identifier


Known issues:
- May not recognize some third party formats 
*/

function run(folder) {
    // Get Plaintext Types from LaunchBar plist
    try {
        var plainTextFileTypes = File.readPlist('/Applications/LaunchBar.app/Contents/Resources/PlainTextFileTypes.plist');
    } catch (exception) {
        LaunchBar.alert('Error while reading plist: ' + exception);
    }
    plainTextFileTypes = plainTextFileTypes.toString()

    var typeDeclarationsGroups = []

    // Get TypeDeclarations from System
    try {
        var contentTypePlist = File.readPlist('/System/Library/CoreServices/CoreTypes.bundle/Contents/Info.plist');
    } catch (exception) {
        LaunchBar.alert('Error while reading plist: ' + exception);
    }

    var UTImportedTypeDeclarations = contentTypePlist.UTImportedTypeDeclarations
    var UTExportedTypeDeclarations = contentTypePlist.UTExportedTypeDeclarations
    var typeDeclarationsSystem = UTImportedTypeDeclarations.concat(UTExportedTypeDeclarations)

    typeDeclarationsGroups.push(typeDeclarationsSystem)

    // Get TypeDeclarations from Apps 
    var apps = File.getDirectoryContents('/Applications/',);
    for (var i = 0; i < apps.length; i++) {
        if (apps[i].endsWith('.app')) {

            var appInfoPlist = '/Applications/' + apps[i] + '/Contents/Info.plist'

            if (File.exists(appInfoPlist)) {
                var content = File.readPlist(appInfoPlist);

                if (content.UTImportedTypeDeclarations != undefined && content.UTExportedTypeDeclarations != undefined) {
                    var UTImportedTypeDeclarations = content.UTImportedTypeDeclarations
                    var UTExportedTypeDeclarations = content.UTExportedTypeDeclarations
                    var typeDeclarationsApp = UTImportedTypeDeclarations.concat(UTExportedTypeDeclarations)
                } else if (content.UTImportedTypeDeclarations != undefined && content.UTExportedTypeDeclarations == undefined) {
                    var typeDeclarationsApp = content.UTImportedTypeDeclarations
                } else if (content.UTImportedTypeDeclarations == undefined && content.UTExportedTypeDeclarations != undefined) {
                    var typeDeclarationsApp = content.UTExportedTypeDeclarations
                }
                typeDeclarationsGroups.push(typeDeclarationsApp)
            }
        }
    }

    var imageExtensions = []
    var movieExtensions = []
    var audioExtensions = []
    var documentExtensions = []
    var presentationExtensions = []

    for (var iG = 0; iG < typeDeclarationsGroups.length; iG++) {

        var typeDeclarations = typeDeclarationsGroups[iG]

        for (var i = 0; i < typeDeclarations.length; i++) {
            var typeConformsTo = typeDeclarations[i].UTTypeConformsTo
    
            if (typeof typeConformsTo === 'object') {
                typeConformsTo = JSON.stringify(typeConformsTo)
            }
    
            if (typeConformsTo != undefined) {
    
                // images
                if (
                    typeConformsTo.includes('public.image')
                    || typeConformsTo.includes('public.camera-raw-image')
                ) {
                    var typeTagSpecification = typeDeclarations[i].UTTypeTagSpecification
                    if (typeTagSpecification != undefined) {
                        imageExtensions.push(typeTagSpecification["public.filename-extension"])
                    }
                }
    
                // movies, videos
                if (
                    typeConformsTo.includes('public.movie')
                    || typeConformsTo.includes('public.video')
                ) {
                    var typeTagSpecification = typeDeclarations[i].UTTypeTagSpecification
                    if (typeTagSpecification != undefined) {
                        movieExtensions.push(typeTagSpecification["public.filename-extension"])
                    }
                }
                // audio
                if (
                    typeConformsTo.includes('public.audio')
                    || typeConformsTo.includes('public.mpeg-4-audio')
                ) {
                    var typeTagSpecification = typeDeclarations[i].UTTypeTagSpecification
                    if (typeTagSpecification != undefined) {
                        audioExtensions.push(typeTagSpecification["public.filename-extension"])
                    }
                }
    
                // presentations
                if (
                    typeConformsTo.includes('public.presentation')
                ) {
                    var typeTagSpecification = typeDeclarations[i].UTTypeTagSpecification
                    if (typeTagSpecification != undefined) {
                        presentationExtensions.push(typeTagSpecification["public.filename-extension"])
                    }
                }
    
                // documents
                if (
                    typeConformsTo.includes('public.composite-content')
                    || typeConformsTo.includes('public.spreadsheet')
                    || typeConformsTo.includes('public.text')
                    || typeConformsTo.includes('public.source-code')
                    || typeConformsTo.includes('public.script')
                    || typeConformsTo.includes('public.plain-text')
                ) {
                    var typeTagSpecification = typeDeclarations[i].UTTypeTagSpecification
                    if (typeTagSpecification != undefined) {
                        documentExtensions.push(typeTagSpecification["public.filename-extension"])
                    }
                }
            }
        }
    }

    presentationExtensions = presentationExtensions
        .toString()
        .split(',')
    documentExtensions = documentExtensions
        .toString()
        .concat(plainTextFileTypes)
        // .concat(',textclipping')
        .concat(',textclipping,mscz')
        .split(',')
    imageExtensions = imageExtensions
        .toString()
        .concat(',pxm,pxd,afphoto,afdesign')
        .split(',')
    movieExtensions = movieExtensions
        .toString()
        .split(',')
    audioExtensions = audioExtensions
        .toString()
        .split(',')


    // presentations
    var presentationData = []
    for (var i = 0; i < presentationExtensions.length; i++) {
        if (!presentationData.includes(presentationExtensions[i]) && presentationExtensions[i] != '') {
            presentationData.push(presentationExtensions[i])
        }
    }
    Action.preferences.presentationExtensions = presentationData

    // documents
    var docData = []
    for (var i = 0; i < documentExtensions.length; i++) {
        if (!docData.includes(documentExtensions[i]) && documentExtensions[i] != '') {
            docData.push(documentExtensions[i])
        }
    }
    Action.preferences.documentExtensions = docData

    // images
    var imageData = []
    for (var i = 0; i < imageExtensions.length; i++) {
        if (!imageData.includes(imageExtensions[i]) && imageExtensions[i] != '') {
            imageData.push(imageExtensions[i])
        }
    }
    Action.preferences.imageExtensions = imageData

    // movies
    var movieData = []
    for (var i = 0; i < movieExtensions.length; i++) {
        if (!movieData.includes(movieExtensions[i]) && movieExtensions[i] != '') {
            movieData.push(movieExtensions[i])
        }
    }
    Action.preferences.movieExtensions = movieData

    // audio
    var audioData = []
    for (var i = 0; i < audioExtensions.length; i++) {
        if (!audioData.includes(audioExtensions[i]) && audioExtensions[i] != '') {
            audioData.push(audioExtensions[i])
        }
    }
    Action.preferences.audioExtensions = audioData


    // --- --- --- //

    // Check Folder Content
    var contents = File.getDirectoryContents(folder)

    var extensions = []
    var files = []

    for (var i = 0; i < contents.length; i++) {

        var item = contents[i]
        var path = folder + '/' + item
        var hasExtension = item
            .match(/\.([\w]+$)/)

        if (hasExtension != null) {
            var extension = hasExtension[1]
                .toLowerCase()
        } else {
            var extension = ''
        }

        // if (!File.isDirectory(path) || extension == 'mindnode' || extension == 'pxd') {
        if (extension != '') {
            files.push({
                'extension': extension,
                'path': path
            })
            extensions.push(extension)
        }
    }

    // Create key with file path and extensions of files in selected Folder
    Action.preferences.fileInSelectedFolder = files

    // Get types of files in Folder
    var aCount = []
    var mCount = []
    var iCount = []
    var dCount = []
    var pCount = []

    var aExts = Action.preferences.audioExtensions
    var mExts = Action.preferences.movieExtensions
    var iExts = Action.preferences.imageExtensions
    var dExts = Action.preferences.documentExtensions
    var pExts = Action.preferences.presentationExtensions

    for (var i = 0; i < extensions.length; i++) {
        var extension = extensions[i]
        for (var iA = 0; iA < aExts.length; iA++) {
            if (aExts[iA] == extension) {
                var audio = true
                aCount.push(extension)
            }
        }

        for (var iM = 0; iM < mExts.length; iM++) {
            if (mExts[iM] == extension) {
                var movie = true
                mCount.push(extension)
            }
        }

        for (var iI = 0; iI < iExts.length; iI++) {
            if (iExts[iI] == extension) {
                var image = true
                iCount.push(extension)
            }
        }

        for (var iP = 0; iP < pExts.length; iP++) {
            if (pExts[iP] == extension) {
                var presentation = true
                pCount.push(extension)
            }
        }
        for (var iD = 0; iD < dExts.length; iD++) {
            if (dExts[iD] == extension) {
                var document = true
                dCount.push(extension)
            }
        }
    }

    var types = []

    if (audio == true) {

        types.push({
            'title': 'Audio (' + aCount.length + ')',
            'icon': 'audioTemplate',
            'action': 'showSelection',
            'actionArgument': JSON.stringify(Action.preferences.audioExtensions)
        })
    }

    if (image == true) {
        types.push({
            'title': 'Images (' + iCount.length + ')',
            'icon': 'imageTemplate',
            'action': 'showSelection',
            'actionArgument': JSON.stringify(Action.preferences.imageExtensions)
        })
    }

    if (movie == true) {
        types.push({
            'title': 'Movies (' + mCount.length + ')',
            'icon': 'movieTemplate',
            'action': 'showSelection',
            'actionArgument': JSON.stringify(Action.preferences.movieExtensions)
        })
    }

    if (presentation == true) {
        types.push({
            'title': 'Presentations (' + pCount.length + ')',
            'icon': 'presentationTemplate',
            'action': 'showSelection',
            'actionArgument': JSON.stringify(Action.preferences.presentationExtensions)
        })
    }

    if (document == true) {
        types.push({
            'title': 'Documents (' + dCount.length + ')',
            'icon': 'docTemplate',
            'action': 'showSelection',
            'actionArgument': JSON.stringify(Action.preferences.documentExtensions)
        })
    }

    return types
}

function showSelection(e) {
    e = eval(e)
    var files = Action.preferences.fileInSelectedFolder

    var result = []
    var check = []
    for (var i = 0; i < files.length; i++) {
        for (var iE = 0; iE < e.length; iE++) {
            if (e[iE] == files[i].extension) {
                if (!check.includes(files[i].path)) {
                    check.push(files[i].path)
                    result.push({
                        'path': files[i].path,
                        'ext': files[i].extension
                    })
                }
            }
        }
    }
    result.sort(function (a, b) {
        return a.ext > b.ext;
    });
    return result
}