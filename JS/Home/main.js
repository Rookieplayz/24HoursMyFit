var UserInformation={};
var LoginDetails={};
var PhysicalDetails={};
var OverallFocus={};
var UserDetail={};
var ProfileCover={};
var Achievements={}
var UserTheme={
  //PrimaryColor:
  //SecondaryColor:
  //AccentColor:
  //Font
  //..
}
var Gallery={}
var Profile={}
var email="";
var currentuser;
document.getElementById("uname").innerHTML="";
document.getElementById("fitPoints").innerHTML="";
document.getElementById("followingCount").innerHTML="";
document.getElementById("followersCount").innerHTML="";
$(".user-theme-accent").css("color",localStorage.getItem("Username"));
mainThread();
var maintimeout;
function mainThread(){
  maintimeout= setInterval(() => {
    grabUserDetailsFromDB();
    document.getElementById("uname").innerHTML=localStorage.getItem("Username");
    document.getElementById("fitPoints").innerHTML=localStorage.getItem("fitPoints");
    document.getElementById("followingCount").innerHTML=localStorage.getItem("followingCount")+" Followings";
    document.getElementById("followersCount").innerHTML=localStorage.getItem("followersCount")+" Followers";
    
    
  }, 1000);
}
function grabUserDetailsFromDB(){
firebase.auth().onAuthStateChanged(function(user) { //or use firebase.auth().currentUser;
if (user) {
 // User is signed in.
 firebase.database().ref('Users/' + user.uid).once('value').then(function(snapshot) {
 email=user.email;
  currentuser=user;
   LoginDetails=snapshot.val().LoginDetails;
   PhysicalDetails=snapshot.val().PhysicalDetails;
   OverallFocus=snapshot.val().OverallFocus;
   UserDetail=snapshot.val().UserDetails;
   ProfileCover=snapshot.val().Cover;
   UserInformation = {
    LoginDetails:LoginDetails,
    UserDetails:UserDetail,
    PhysicalDetails:PhysicalDetails,
    OverallFocus: OverallFocus
};
    // ...
    console.log(UserInformation);
    if(document.getElementById("uname").value==="")
    document.getElementById("uname").innerHTML=(UserInformation.LoginDetails.username);
    let db = firebase.firestore();

    UserInformation.LoginDetails.profileImg!=""?document.getElementById("profilePicture").src=user.photoURL:UserInformation.UserDetails.gender.toLowerCase()=="female"?document.getElementById("profilePicture").src="http://primacollisionrepairs.co.nz/wp-content/uploads/2018/06/user-female-icon.png":document.getElementById("profilePicture").src="https://raw.githubusercontent.com/azouaoui-med/pro-sidebar-template/gh-pages/src/img/user.jpg";
  db.collection("MyFit").doc(user.uid)
    .onSnapshot(function(doc) {
        console.log("Current data: ", doc.data());
        Profile=doc.data();
        localStorage.setItem("Username",UserInformation.LoginDetails.username);
        localStorage.setItem("fitPoints",Profile.Profile.FitPoint);
        localStorage.setItem("followingCount",Profile.Profile.Following.length);
        localStorage.setItem("followersCount",Profile.Profile.Followers.length);
        
        localStorage.setItem("CoverUrl",ProfileCover.image);
        localStorage.setItem("CoverColor",ProfileCover.color);
        localStorage.setItem("CoverEffect",ProfileCover.effect);

        localStorage.setItem("fname",UserInformation.UserDetails.firstName);
        localStorage.setItem("lname",UserInformation.UserDetails.lastName);
        localStorage.setItem("gender",UserInformation.UserDetails.gender);
        localStorage.setItem("dob",UserInformation.UserDetails.dob);
        
        UserTheme=Profile.Profile.myTheme;
        console.log(UserTheme);
        
        $(".user-theme-accent").css("color",UserTheme.Accent);
        localStorage.setItem("theme-accent",UserTheme.Accent);
      

        if(document.getElementById("fitPoints").value==="")
        document.getElementById("fitPoints").innerHTML=Profile.Profile.FitPoint + "<sub>Fp</sub>";
        if(document.getElementById("followersCount").value==="")
        document.getElementById("followersCount").innerHTML=Profile.Profile.Followers.length +" Followers";
        if(document.getElementById("followingCount").value==="")
        document.getElementById("followingCount").innerHTML=Profile.Profile.Following.length+" Following";
    });
    
    document.getElementById("signout").addEventListener("click",function () {
      logout();
      
    })

  });
  
} else {
// No user is signed in.
window.location.replace("../../HTML/login2.html");
clearInterval(maintimeout);
}

});
}
jQuery(function ($) {

  // Dropdown menu
  $(".sidebar-dropdown > a").click(function () {
      $(".sidebar-submenu").slideUp(200);
      if ($(this).parent().hasClass("active")) {
          $(".sidebar-dropdown").removeClass("active");
          $(this).parent().removeClass("active");
      } else {
          $(".sidebar-dropdown").removeClass("active");
          $(this).next(".sidebar-submenu").slideDown(200);
          $(this).parent().addClass("active");
      }

  });

  //toggle sidebar
  $("#toggle-sidebar").click(function () {
      $(".page-wrapper").toggleClass("toggled");
  });
  //Pin sidebar
  $("#pin-sidebar").click(function () {
      if ($(".page-wrapper").hasClass("pinned")) {
          // unpin sidebar when hovered
          $(".page-wrapper").removeClass("pinned");
          $("#sidebar").unbind( "hover");
      } else {
          $(".page-wrapper").addClass("pinned");
          $("#sidebar").hover(
              function () {
                  console.log("mouseenter");
                  $(".page-wrapper").addClass("sidebar-hovered");
              },
              function () {
                  console.log("mouseout");
                  $(".page-wrapper").removeClass("sidebar-hovered");
              }
          )

      }
  });
  $("#close-sidebar").click(function() {
    $(".page-wrapper").removeClass("toggled");
  });
  $("#show-sidebar").click(function() {
    $(".page-wrapper").addClass("toggled");
  });

  //toggle sidebar overlay
  $("#overlay").click(function () {
      $(".page-wrapper").toggleClass("toggled");
  });

  //switch between themes 
  var themes = "default-theme legacy-theme chiller-theme ice-theme cool-theme light-theme";
  $('[data-theme]').click(function () {
      $('[data-theme]').removeClass("selected");
      $(this).addClass("selected");
      $('.page-wrapper').removeClass(themes);
      $('.page-wrapper').addClass($(this).attr('data-theme'));
  });

  // switch between background images
  var bgs = "bg1 bg2 bg3 bg4";
  $('[data-bg]').click(function () {
      $('[data-bg]').removeClass("selected");
      $(this).addClass("selected");
      $('.page-wrapper').removeClass(bgs);
      $('.page-wrapper').addClass($(this).attr('data-bg'));
  });

  // toggle background image
  $("#toggle-bg").change(function (e) {
      e.preventDefault();
      $('.page-wrapper').toggleClass("sidebar-bg");
  });

  // toggle border radius
  $("#toggle-border-radius").change(function (e) {
      e.preventDefault();
      $('.page-wrapper').toggleClass("boder-radius-on");
  });

  //custom scroll bar is only used on desktop
  if (!/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      $(".sidebar-content").mCustomScrollbar({
          axis: "y",
          autoHideScrollbar: true,
          scrollInertia: 300
      });
      $(".sidebar-content").addClass("desktop");

  }
});
  
  function logout(){
    var valid=true;
    var uname=$("#pword").val().toLowerCase().trim();
    uname=uname.replace(" ","");
    console.log((UserInformation.LoginDetails.username).toLowerCase().trim().replace(" ",""))
    if(uname!=(UserInformation.LoginDetails.username).toLowerCase().trim().replace(" ",""))
    { 
      valid=false;
      document.getElementById("err").innerHTML="Oops, Username Doesn't Match";

    }
    else{
     
    }
   
 
    if(valid){
      document.getElementById("err").innerHTML="";
      firebase.auth().signOut().then(function() {
    // Sign-out successful.
    localStorage.clear();
      window.location.href
  }).catch(function(error) {
    // An error happened.
    });
    }
  
    
  }
    function openForm() {
      document.getElementById("myForm").style.display = "block";
      document.getElementById("modal_overlay").style.display = "block";
      
    }
    
    function closeForm() {
      document.getElementById("myForm").style.display = "none";
      document.getElementById("modal_overlay").style.display = "none";
    }
    