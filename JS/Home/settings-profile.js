var imgurl;
$('#closeNewPhoto').removeClass("btn-primary")
$('#saveNewPhoto').removeClass("btn-secondary")
$('#saveNewPhoto').addClass("btn-primary")
$('#closeNewPhoto').addClass("btn-secondary")
$(".success-checkmark").hide();
document.getElementById("newPhoto").src="../../Resources/icons/camera-ic.png"
$("#imgbtn1").on("click",function () {
    console.log("click");
    
    $('#closeNewPhoto').removeClass("btn-primary")
    $('#saveNewPhoto').removeClass("btn-secondary")
    $('#saveNewPhoto').addClass("btn-primary")
    $('#closeNewPhoto').addClass("btn-secondary")
        $("#saveNewPhoto").removeAttr("disabled");
        $(".success-checkmark").hide();
})
function previewFile() {
    $('#closeNewPhoto').removeClass("btn-primary")
    $('#saveNewPhoto').removeClass("btn-secondary")
    $('#saveNewPhoto').addClass("btn-primary")
    $('#closeNewPhoto').addClass("btn-secondary")
        $("#saveNewPhoto").removeAttr("disabled");
        $(".success-checkmark").hide();
    var preview = document.querySelector('img'); //selects the query named img
    file = document.querySelector('input[type=file]').files[0]; //sames as here
    var reader = new FileReader();

    reader.onloadend = function () {

        document.getElementById("newPhoto").src=reader.result;

    }

    if (file) {
        document.getElementById("imgbtn").style.border = "2px solid green;";
        reader.readAsDataURL(file); //reads the data as a URL
        imgurl = reader.result;

    } 
}
(function($){
"use Strict";

$("#saveNewPhoto").on("click",function () {
 
    //show progress
    //upload to firebase
    firebase.auth().onAuthStateChanged(function (user) { //or use firebase.auth().currentUser;
        if (user) {
            // User is signed in.
            try {
                
            
            if (file) {
                var metadata = {
                    name: imgurl,
                    contentType: 'image/jpeg'

                };
                var storage = firebase.storage();
                var storageRef = storage.ref();
                
                // Upload file and metadata to the object 'images/mountains.jpg'
                var uploadTask = storageRef.child("Users/"+user.uid + '/images/' + file.name).put(file, metadata);
                uploadTask.on(firebase.storage.TaskEvent.STATE_CHANGED, // or 'state_changed'
                    function (snapshot) {
                        // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
                        var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        
                        progress=Math.floor(progress);
                        console.log('Upload is ' + progress + '% done');
                        $(".progress").show();
                        $("#progressPic").attr("aria-valuenow",progress);
                        $("#progressPic").html(progress+"%");
                        $("#progressPic").css("width",progress+"%");
                        switch (snapshot.state) {
                            case firebase.storage.TaskState.PAUSED: // or 'paused'
                                console.log('Upload is paused');
                                break;
                            case firebase.storage.TaskState.RUNNING: // or 'running'
                                console.log('Upload is running');
                                break;
                        }
                    }, function (error) {

                        // A full list of error codes is available at
                        // https://firebase.google.com/docs/storage/web/handle-errors
                        switch (error.code) {
                            case 'storage/unauthorized':
                                // User doesn't have permission to access the object
                                break;

                            case 'storage/canceled':
                                // User canceled the upload
                                break;

                            case 'storage/unknown':
                                // Unknown error occurred, inspect error.serverResponse
                                break;
                        }
                    }, function () {
                        $('#saveNewPhoto').removeClass("btn-primary")
                        $('#closeNewPhoto').removeClass("btn-secondary")
                        $('#closeNewPhoto').addClass("btn-primary")
                        $('#saveNewPhoto').addClass("btn-secondary")
                        $("#saveNewPhoto").attr("disabled", true);
                        $(".progress").hide();
                        $(".success-checkmark").show();
                        /*$(".progress").html(
                            "<div class='success-checkmark'><div class='check-icon'><span class='icon-line line-tip'></span><span class='icon-line line-long'></span><div class='icon-circle'></div><div class='icon-fix'></div></div></div>"
                        );*/
                        $(".check-icon").hide();
                        setTimeout(function () {
                          $(".check-icon").show();
                        }, 10);

                        // Upload completed successfully, now we can get the download URL
                        uploadTask.snapshot.ref.getDownloadURL().then(function (downloadURL) {
                            user.updateProfile({photoURL: downloadURL});
                            imgurl=downloadURL;
                            UserInformation.LoginDetails.profileImg=imgurl;
                            //Store in DB
                            console.log(imgurl);
                            firebase.database().ref('Users/' + user.uid+"/LoginDetails/profileImg").set(imgurl);
                        
                        });
                    });  /*---------- */  
            }
         else {
            // No user is signed in.
        }
    } catch (error) {
            alert("No Changes Made!");
           $('#closeNewPhoto').removeClass("btn-primary")
           $('#saveNewPhoto').removeClass("btn-secondary")
           $('#saveNewPhoto').addClass("btn-primary")
           $('#closeNewPhoto').addClass("btn-secondary")
           $("#saveNewPhoto").attr("disabled", false);
    }
}
});
})
$('[data-toggle="tooltip"]').tooltip()
   userInfoThread()
$("#changeAvatar").on("click",function () {
    
$(".progress").hide();
});
var ready=false;
function userInfoThread(){
    var x= setInterval(() => {
        
         
        try {
            console.log(2);
            
            UserInformation.LoginDetails.profileImg!=""?document.getElementById("changeAvatar").src=UserInformation.LoginDetails.profileImg:UserInformation.UserDetails.gender.toLowerCase()=="female"?document.getElementById("changeAvatar").src="http://primacollisionrepairs.co.nz/wp-content/uploads/2018/06/user-female-icon.png":document.getElementById("changeAvatar").src="https://raw.githubusercontent.com/azouaoui-med/pro-sidebar-template/gh-pages/src/img/user.jpg";
          
            clearInterval(x)
        } catch (error) {
            console.log(error);
            
        }
    }, 1000);
}
})(jQuery);