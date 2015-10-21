History = new Mongo.Collection("history");
Playlists = new Mongo.Collection("playlists");
Rooms = new Mongo.Collection("rooms");
Queues = new Mongo.Collection("queues");
Chat = new Mongo.Collection("chat");

function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

if (Meteor.isClient) {
    Meteor.startup(function() {
        reCAPTCHA.config({
            publickey: '6LcVxg0TAAAAAE18vBiH00UAyaJggsmLm890SjZl'
        });
    });

    Meteor.subscribe("queues");

    var hpSound = undefined;
    var songsArr = [];
    var ytArr = [];
    var _sound = undefined;
    var parts = location.href.split('/');
    var id = parts.pop();
    var type = id.toLowerCase();

    function getSpotifyInfo(title, cb) {
        $.ajax({
            type: "GET",
            url: 'https://api.spotify.com/v1/search?q=' + encodeURIComponent(title.toLowerCase()) + '&type=track',
            applicationType: "application/json",
            contentType: "json",
            success: function (data) {
                cb(data);
            }
        });
    }

    function getSpotifyArtist(data) {
        var temp = "";
        var artist;
        if(data.artists.length >= 2){
            for(var k in data.artists){
                temp = temp + data.artists[k].name + ", ";
            }
        } else{
            for(var k in data.artists){
                temp = temp + data.artists[k].name;
            }
        }
        if(temp[temp.length-2] === ","){
            artist = temp.substr(0,temp.length-2);
        } else{
            artist = temp;
        }
        return artist;
    }

    Template.register.events({
        "submit form": function(e){
            e.preventDefault();
            var username = e.target.registerUsername.value;
            var email = e.target.registerEmail.value;
            var password = e.target.registerPassword.value;
            var captchaData = grecaptcha.getResponse();
            Meteor.call("createUserMethod", {username: username, email: email, password: password}, captchaData, function(err, res) {
                grecaptcha.reset();

                if (err) {
                    console.log(err);
                    $(".container").after('<div class="alert alert-danger" role="alert"><strong>Oh Snap!</strong> ' + err.reason + '</div>')
                } else {
                    Meteor.loginWithPassword(username, password);
                }
            });
        },

        "click #facebook-login": function(){
            Meteor.loginWithFacebook()
        },

        "click #github-login": function(){
            Meteor.loginWithGithub()
        },

        "click #login": function(){
            $("#register-view").hide();
            $("#login-view").show();
        }
    });

    Template.login.events({
        "submit form": function(e){
            e.preventDefault();
            var username = e.target.loginUsername.value;
            var password = e.target.loginPassword.value;
            Meteor.loginWithPassword(username, password);
            Accounts.onLoginFailure(function(){
                $("input").css("background-color","indianred").addClass("animated shake");
                    $("input").on("click",function(){
                        $("input").css({
                            "background-color": "transparent",
                            "width": "250px"
                     });
                })
            });
        },

        "click #facebook-login": function(){
            Meteor.loginWithFacebook()
        },

        "click #github-login": function(){
            Meteor.loginWithGithub()
        },

        "click #register": function(){
            $("#login-view").hide();
            $("#register-view").show();
        }
    });

    Template.dashboard.events({
        "click .logout": function(e){
            e.preventDefault();
            Meteor.logout();
            if (hpSound !== undefined) {
                hpSound.stop();
            }
        },

        "click #croom_create": function() {
            Meteor.call("createRoom", $("#croom").val(), function (err, res) {
                if (err) {
                    alert("Error " + err.error + ": " + err.reason);
                } else {
                    window.location = "/" + $("#croom").val();
                }
            });
        }
    });

    Template.dashboard.helpers({
      rooms: function() {
        return Rooms.find({});
      }
    })

    Template.room.events({
        "click #add-song-button": function(e){
            e.preventDefault();
            parts = location.href.split('/');
            id = parts.pop();
            var genre = id.toLowerCase();
            var type = $("#type").val();
            id = $("#id").val();
            var title = $("#title").val();
            var artist = $("#artist").val();
            var img = $("#img").val();
            var songData = {type: type, id: id, title: title, artist: artist, img: img};
            Meteor.call("addSongToQueue", genre, songData, function(err, res) {
                console.log(err, res);
            });
        },
        "click #return": function(e){
            $("#add-info").hide();
            $("#search-info").show();
        },
        "click #search-song": function(){
            $("#song-results").empty();
            var search_type = $("#search_type").val();
            if (search_type === "YouTube") {
                $.ajax({
                    type: "GET",
                    url: "https://www.googleapis.com/youtube/v3/search?part=snippet&q=" +  $("#song-input").val() + "&key=AIzaSyAgBdacEWrHCHVPPM4k-AFM7uXg-Q__YXY",
                    applicationType: "application/json",
                    contentType: "json",
                    success: function(data){
                        for(var i in data.items){
                            $("#song-results").append("<p>" + data.items[i].snippet.title + "</p>");
                            ytArr.push({title: data.items[i].snippet.title, id: data.items[i].id.videoId});
                        }
                        $("#song-results p").click(function(){
                            $("#search-info").hide();
                            $("#add-info").show();
                            var title = $(this).text();
                            for(var i in ytArr){
                                if(ytArr[i].title === title){
                                    var songObj = {
                                        id: ytArr[i].id,
                                        title: ytArr[i].title,
                                        type: "youtube"
                                    };
                                    $("#title").val(songObj.title);
                                    $("#artist").val("");
                                    $("#id").val(songObj.id);
                                    $("#type").val("YouTube");
                                    getSpotifyInfo(songObj.title.replace(/\[.*\]/g, ""), function(data) {
                                        if (data.tracks.items.length > 0) {
                                            $("#title").val(data.tracks.items[0].name);
                                            var artists = [];
                                            $("#img").val(data.tracks.items[0].album.images[1].url);

                                            data.tracks.items[0].artists.forEach(function(artist) {
                                                artists.push(artist.name);
                                            });

                                            $("#artist").val(artists.join(", "));
                                        }
                                    });
                                }
                            }
                        })
                    }
                })
            } else if (search_type === "SoundCloud") {
                SC.get('/tracks', { q: $("#song-input").val()}, function(tracks) {
                    for(var i in tracks){
                        $("#song-results").append("<p>" + tracks[i].title + "</p>")
                        songsArr.push({title: tracks[i].title, id: tracks[i].id, duration: tracks[i].duration / 1000});
                    }
                    $("#song-results p").click(function(){
                        $("#search-info").hide();
                        $("#add-info").show();
                        var title = $(this).text();
                        for(var i in songsArr){
                            if(songsArr[i].title === title){
                                var id = songsArr[i].id;
                                var duration = songsArr[i].duration;
                                var songObj = {
                                    title: songsArr[i].title,
                                    id: id,
                                    duration: duration,
                                    type: "soundcloud"
                                }
                                $("#title").val(songObj.title);
                                // Set ID field
                                $("#id").val(songObj.id);
                                $("#type").val("SoundCloud");
                                getSpotifyInfo(songObj.title.replace(/\[.*\]/g, ""), function(data) {
                                    if (data.tracks.items.length > 0) {
                                        $("#title").val(data.tracks.items[0].name);
                                        var artists = [];
                                        data.tracks.items[0].artists.forEach(function(artist) {
                                            artists.push(artist.name);
                                        });
                                        $("#artist").val(artists.join(", "));
                                    }
                                    // Set title field again if possible
                                    // Set artist if possible
                                });
                            }
                        }
                    })
                });
            }
        },
        "click #add-songs": function(){
          $("#add-songs-modal").show();
        },
        "click #close-modal": function(){
          $("#search-info").show();
          $("#add-info").hide();
        },
        "click #submit-message": function(){
            var message = $("#chat-input").val();
            Meteor.call("sendMessage", type, message);
        }
    });

    Template.room.helpers({
        type: function() {
          var parts = location.href.split('/');
          var id = parts.pop();
          return id.toUpperCase();
        },
        title: function(){
          return Session.get("title");
        },
        artist: function(){
          return Session.get("artist");
        },
        title_next: function(){
            return Session.get("title_next");
        },
        artist_next: function(){
            return Session.get("artist_next");
        },
        title_after: function(){
            return Session.get("title_after");
        },
        artist_after: function(){
            return Session.get("artist_after");
        },
        loaded: function() {
          return Session.get("loaded");
        },
        chat: function() {
            var chatArr = Chat.find({type: type}).fetch();
            if (chatArr.length === 0) {
                return [];
            } else {
                return chatArr[0].messages;
            }
        }
    });

    Template.admin.helpers({
        queues: function() {
            return Queues.find({});
        }
    });

    var yt_player = undefined;
    var _sound = undefined;

    Template.admin.events({
        "click .preview-button": function(e){
            Session.set("song", this);
        },
        "click #add-song-button": function(e){
            var genre = $(e.toElement).data("genre") || $(e.toElement).parent().data("genre");
            Meteor.call("addSongToPlaylist", genre, this);
        },
        "click #deny-song-button": function(e){
            var genre = $(e.toElement).data("genre") || $(e.toElement).parent().data("genre");
            Meteor.call("removeSongFromQueue", genre, this.id);
        },
        "click #play": function() {
            $("#play").attr("disabled", true);
            $("#stop").attr("disabled", false);
            var song = Session.get("song");
            var id = song.id;
            var type = song.type;

            if (type === "YouTube") {
                if (yt_player === undefined) {
                    yt_player = new YT.Player("previewPlayer", {
                        height: 540,
                        width: 568,
                        videoId: id,
                        playerVars: {autoplay: 1, controls: 0, iv_load_policy: 3},
                        events: {
                            'onReady': function(event) {
                                event.target.playVideo();
                            }
                        }
                    });
                } else {
                    yt_player.loadVideoById(id);
                }
                $("#previewPlayer").show();
            } else if (type === "SoundCloud") {
                SC.stream("/tracks/" + song.id, function(sound) {
                    _sound = sound;
                    sound._player._volume = 0.3;
                    sound.play();
                });
            }
        },
        "click #stop": function() {
            $("#play").attr("disabled", false);
            $("#stop").attr("disabled", true);
            if (yt_player !== undefined) {
                yt_player.stopVideo();
            }
            if (_sound !== undefined) {
                _sound.stop();
            }
        }
    });

    Template.admin.onCreated(function() {
        var tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    });

    Template.admin.onRendered(function() {
        $("#previewModal").on("hidden.bs.modal", function() {
            if (yt_player !== undefined) {
                $("#play").attr("disabled", false);
                $("#stop").attr("disabled", true);
                $("#previewPlayer").hide();
                yt_player.loadVideoById("", 0);
                yt_player.seekTo(0);
                yt_player.stopVideo();
            }
            if (_sound !== undefined) {
                _sound.stop();
                $("#play").attr("disabled", false);
                $("#stop").attr("disabled", true);
            }
        });
    });

    Template.playlist.helpers({
        playlist_songs: function() {
            var data = Playlists.find({type: type}).fetch();
            if (data !== undefined && data.length > 0) {
                return data[0].songs;
            } else {
                return [];
            }
        }
    });

    Meteor.subscribe("rooms");
    Meteor.subscribe("chat");

    Template.room.onCreated(function () {
        var tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        var currentSong = undefined;
        var nextSong = undefined;
        var afterSong = undefined;
        var _sound = undefined;
        var yt_player = undefined;
        var size = 0;
        var artistStr;
        var temp = "";
        var currentArt;

        function getTimeElapsed() {
            if (currentSong !== undefined) {
                return Date.now() - currentSong.started;
            }
            return 0;
        }

        function getSongInfo(songData){
            Session.set("title", songData.title);
            Session.set("artist", songData.artist);
            $("#song-img").attr("src", songData.img);
            Session.set("duration", songData.duration);
        }

        function resizeSeekerbar() {
            $("#seeker-bar").width(((getTimeElapsed() / 1000) / Session.get("duration") * 100) + "%");
        }

        function startSong() {
            if (currentSong !== undefined) {
                if (_sound !== undefined) _sound.stop();
                if (yt_player !== undefined && yt_player.stopVideo !== undefined) yt_player.stopVideo();

                if (currentSong.type === "soundcloud") {
                  $("#player").attr("src", "")
                  getSongInfo(currentSong);
                  SC.stream("/tracks/" + currentSong.id + "#t=20s", function(sound){
                    _sound = sound;
                    sound._player._volume = 0.3;
                    sound.play();
                    var interval = setInterval(function() {
                        if (sound.getState() === "playing") {
                            sound.seek(getTimeElapsed());
                            window.clearInterval(interval);
                        }
                    }, 200);
                    // Session.set("title", currentSong.title || "Title");
                    // Session.set("artist", currentSong.artist || "Artist");
                    Session.set("duration", currentSong.duration);
                    resizeSeekerbar();
                  });
                } else {
                    if (yt_player === undefined) {
                        yt_player = new YT.Player("player", {
                            height: 540,
                            width: 960,
                            videoId: currentSong.id,
                            events: {
                                'onReady': function(event) {
                                    event.target.seekTo(getTimeElapsed() / 1000);
                                    event.target.playVideo();
                                    resizeSeekerbar();
                                },
                                'onStateChange': function(event){
                                    if (event.data == YT.PlayerState.PAUSED) {
                                        event.target.seekTo(getTimeElapsed() / 1000);
                                        event.target.playVideo();
                                    }
                                }
                            }
                        });
                    } else {
                        yt_player.loadVideoById(currentSong.id);
                    }

                    // Session.set("title", currentSong.title || "Title");
                    // Session.set("artist", currentSong.artist || "Artist");
                    getSongInfo(currentSong);
                    //Session.set("duration", currentSong.duration);
                }
            }
        }

        Meteor.subscribe("history");
        Meteor.subscribe("playlists");
        Session.set("loaded", false);
        Meteor.subscribe("rooms", function() {
            var parts = location.href.split('/');
            var id = parts.pop();
            var type = id.toLowerCase();
            if (Rooms.find({type: type}).count() !== 1) {
                window.location = "/";
            } else {
                Session.set("loaded", true);
                Meteor.setInterval(function () {
                    var data = undefined;
                    var dataCursorH = History.find({type: type});
                    var dataCursorP = Playlists.find({type: type});
                    dataCursorH.forEach(function (doc) {
                        if (data === undefined) {
                            data = doc;
                        }
                    });
                    if (data !== undefined && data.history.length > size) {
                        //currentSong = data.history[data.history.length - 1];
                        var songArray = Playlists.find({type: type}).fetch()[0].songs;
                        var historyObj = data.history[data.history.length - 1];
                        songArray.forEach(function(song) {
                            if (song.id === historyObj.song.id) {
                                currentSong = song;
                            }
                        });
                        currentSong.started = historyObj.started;
                        var songs = dataCursorP.fetch()[0].songs;
                        songs.forEach(function(song, index) {
                            if (currentSong.title === song.title) {
                                if (index + 1 < songs.length) {
                                    nextSong = songs[index + 1];
                                } else {
                                    nextSong = songs[0];
                                }
                                Session.set("title_next", nextSong.title);
                                Session.set("artist_next", nextSong.artist);
                                $("#song-img-next").attr("src", nextSong.img);

                                if (index + 2 < songs.length) {
                                    afterSong = songs[index + 2];
                                } else if (songs.length === index + 1 && songs.length > 1 ) {
                                    afterSong = songs[1];
                                } else {
                                    afterSong = songs[0];
                                }
                                Session.set("title_after", afterSong.title);
                                Session.set("artist_after", afterSong.artist);
                                $("#song-img-after").attr("src",afterSong.img);
                            }
                        });
                        size = data.history.length;
                        startSong();
                    }
                }, 1000);
                Meteor.setInterval(function () {
                    resizeSeekerbar();
                }, 50);
            }
        });
    });
}

if (Meteor.isServer) {
    Meteor.startup(function() {
        reCAPTCHA.config({
            privatekey: '6LcVxg0TAAAAAI2fgIEEWHFxwNXeVIs8mzq5cfRM'
        });
    });

    Meteor.users.deny({update: function () { return true; }});
    Meteor.users.deny({insert: function () { return true; }});
    Meteor.users.deny({remove: function () { return true; }});

    function getSongDuration(query){
        var duration;
        var search = query;
        query = query.toLowerCase().split(" ").join("%20");

        var res = Meteor.http.get('https://api.spotify.com/v1/search?q=' + query + '&type=track');

        for(var i in res.data){
            for(var j in res.data[i].items){
                if(search.indexOf(res.data[i].items[j].name) !== -1){
                    duration = res.data[i].items[j].duration_ms / 1000;
                    return duration;
                }
            }
        }
    }

    function getSongAlbumArt(query){
        var albumart;
        var search = query;
        query = query.toLowerCase().split(" ").join("%20");

        var res = Meteor.http.get('https://api.spotify.com/v1/search?q=' + query + '&type=track');

        for(var i in res.data){
            for(var j in res.data[i].items){
                if(search.indexOf(res.data[i].items[j].name) !== -1){
                    albumart = res.data[i].items[j].album.images[1].url
                    return albumart;
                }
            }
        }
    }

    //var room_types = ["edm", "nightcore"];
    var songsArr = [];

    function getSongsByType(type) {
        if (type === "edm") {
            return [
                {id: "aE2GCa-_nyU", title: "Radioactive - Lindsey Stirling and Pentatonix", duration: getSongDuration("Radioactive - Lindsey Stirling and Pentatonix"), artist: "Lindsey Stirling, Pentatonix", type: "youtube", img: "https://i.scdn.co/image/62167a9007cef2e8ef13ab1d93019312b9b03655"},
                {id: "aHjpOzsQ9YI", title: "Crystallize", artist: "Lindsey Stirling", duration: getSongDuration("Crystallize"), type: "youtube", img: "https://i.scdn.co/image/b0c1ccdd0cd7bcda741ccc1c3e036f4ed2e52312"}
            ];
        } else if (type === "nightcore") {
            return [{id: "f7RKOP87tt4", title: "Monster (DotEXE Remix)", duration: getSongDuration("Monster (DotEXE Remix)"), artist: "Meg & Dia", type: "youtube", img: "https://i.scdn.co/image/35ecdfba9c31a6c54ee4c73dcf1ad474c560cd00"}];
        } else {
            return [{id: "dQw4w9WgXcQ", title: "Never Gonna Give You Up", duration: getSongDuration("Never Gonna Give You Up"), artist: "Rick Astley", type: "youtube", img: "https://i.scdn.co/image/5246898e19195715e65e261899baba890a2c1ded"}];
        }
    }

    Rooms.find({}).fetch().forEach(function(room) {
        var type = room.type;
        if (Playlists.find({type: type}).count() === 0) {
            if (type === "edm") {
                Playlists.insert({type: type, songs: getSongsByType(type)});
            } else if (type === "nightcore") {
                Playlists.insert({type: type, songs: getSongsByType(type)});
            } else {
                Playlists.insert({type: type, songs: getSongsByType(type)});
            }
        }
        if (History.find({type: type}).count() === 0) {
            History.insert({type: type, history: []});
        }
        if (Playlists.find({type: type}).fetch()[0].songs.length === 0) {
            // Add a global video to Playlist so it can proceed
        } else {
            var startedAt = Date.now();
            var playlist = Playlists.find({type: type}).fetch()[0];
            var songs = playlist.songs;
            if (playlist.lastSong === undefined) {
                Playlists.update({type: type}, {$set: {lastSong: 0}});
                playlist = Playlists.find({type: type}).fetch()[0];
                songs = playlist.songs;
            }
            console.log(playlist.lastSong, type);
            console.log(playlist.lastSong, type);
            var currentSong = playlist.lastSong;
            addToHistory(songs[currentSong], startedAt);

            function addToHistory(song, startedAt) {
                History.update({type: type}, {$push: {history: {song: song, started: startedAt}}});
            }

            function skipSong() {
                songs = Playlists.find({type: type}).fetch()[0].songs;
                if (currentSong < (songs.length - 1)) {
                    currentSong++;
                } else currentSong = 0;
                Playlists.update({type: type}, {$set: {lastSong: currentSong}});
                songTimer();
                addToHistory(songs[currentSong], startedAt);
            }

            function songTimer() {
                startedAt = Date.now();
                Meteor.setTimeout(function() {
                    skipSong();
                }, songs[currentSong].duration * 1000);
            }

            songTimer();
        }
    });

    Accounts.onCreateUser(function(options, user) {
        if (options.profile) {
            user.profile = options.profile;
            user.profile.rank = "default";
        }
        return user;
    });

    ServiceConfiguration.configurations.remove({
        service: "facebook"
    });

    ServiceConfiguration.configurations.insert({
        service: "facebook",
        appId: "1496014310695890",
        secret: "9a039f254a08a1488c08bb0737dbd2a6"
    });

    ServiceConfiguration.configurations.remove({
        service: "github"
    });

    ServiceConfiguration.configurations.insert({
        service: "github",
        clientId: "dcecd720f47c0e4001f7",
        secret: "375939d001ef1a0ca67c11dbf8fb9aeaa551e01b"
    });

    Meteor.publish("history", function() {
        return History.find({})
    });

    Meteor.publish("playlists", function() {
        return Playlists.find({})
    });

    Meteor.publish("rooms", function() {
        return Rooms.find({});
    });

    Meteor.publish("queues", function() {
        return Queues.find({});
    });

    Meteor.publish("chat", function() {
        return Chat.find({});
    });

    Meteor.publish("isAdmin", function() {
        return Meteor.users.find({_id: this.userId, "profile.rank": "admin"});
    });

    Meteor.methods({
        createUserMethod: function(formData, captchaData) {
            var verifyCaptchaResponse = reCAPTCHA.verifyCaptcha(this.connection.clientAddress, captchaData);
            if (!verifyCaptchaResponse.success) {
                console.log('reCAPTCHA check failed!', verifyCaptchaResponse);
                throw new Meteor.Error(422, 'reCAPTCHA Failed: ' + verifyCaptchaResponse.error);
            } else {
                console.log('reCAPTCHA verification passed!');
                Accounts.createUser({
                    username: formData.username,
                    email: formData.email,
                    password: formData.password
                });
            }
            return true;
        },
        sendMessage: function(type, message) {
            if (Chat.find({type: type}).count() === 0) {
                Chat.insert({type: type, messages: []});
            }
            Chat.update({type: type}, {$push: {messages: {message: message, userid: "Kris"}}})
        },
        addSongToQueue: function(type, songData) {
            type = type.toLowerCase();
            if (Rooms.find({type: type}).count() === 1) {
                if (Queues.find({type: type}).count() === 0) {
                    Queues.insert({type: type, songs: []});
                }
                if (songData !== undefined && Object.keys(songData).length === 5 && songData.type !== undefined && songData.title !== undefined && songData.title !== undefined && songData.artist !== undefined && songData.img !== undefined) {
                    songData.duration = getSongDuration(songData.title);
                    Queues.update({type: type}, {$push: {songs: {id: songData.id, title: songData.title, artist: songData.artist, duration: songData.duration, img: songData.img, type: songData.type}}});
                    return true;
                } else {
                    throw new Meteor.error(403, "Invalid data.");
                }
            } else {
                throw new Meteor.error(403, "Invalid genre.");
            }
        },
        removeSongFromQueue: function(type, songId) {
            type = type.toLowerCase();
            Queues.update({type: type}, {$pull: {songs: {id: songId}}});
        },
        addSongToPlaylist: function(type, songData) {
            type = type.toLowerCase();
            if (Rooms.find({type: type}).count() === 1) {
                if (Playlists.find({type: type}).count() === 0) {
                    Playlists.insert({type: type, songs: []});
                }
                if (songData !== undefined && Object.keys(songData).length === 6 && songData.type !== undefined && songData.title !== undefined && songData.title !== undefined && songData.artist !== undefined && songData.duration !== undefined && songData.img !== undefined) {
                    Playlists.update({type: type}, {$push: {songs: {id: songData.id, title: songData.title, artist: songData.artist, duration: songData.duration, img: songData.img, type: songData.type}}});
                    Queues.update({type: type}, {$pull: {songs: {id: songData.id}}});
                    return true;
                } else {
                    throw new Meteor.error(403, "Invalid data.");
                }
            } else {
                throw new Meteor.error(403, "Invalid genre.");
            }
        },
        createRoom: function(type) {
            if (Rooms.find({type: type}).count() === 0) {
                Rooms.insert({type: type}, function(err) {
                    if (err) {
                        throw err;
                    } else {
                        if (Playlists.find({type: type}).count() === 1) {
                            if (History.find({type: type}).count() === 0) {
                                History.insert({type: type, history: []}, function(err3) {
                                    if (err3) {
                                        throw err3;
                                    } else {
                                        startStation();
                                        return true;
                                    }
                                });
                            } else {
                                startStation();
                                return true;
                            }
                        } else {
                            Playlists.insert({type: type, songs: getSongsByType(type)}, function (err2) {
                                if (err2) {
                                    throw err2;
                                } else {
                                    if (History.find({type: type}).count() === 0) {
                                        History.insert({type: type, history: []}, function(err3) {
                                            if (err3) {
                                                throw err3;
                                            } else {
                                                startStation();
                                                return true;
                                            }
                                        });
                                    } else {
                                        startStation();
                                        return true;
                                    }
                                }
                            });
                        }
                    }
                });
            } else {
                throw "Room already exists";
            }
            function startStation() {
                var startedAt = Date.now();
                var songs = Playlists.find({type: type}).fetch()[0].songs;
                var currentSong = 0;
                addToHistory(songs[currentSong], startedAt);

                function addToHistory(song, startedAt) {
                    History.update({type: type}, {$push: {history: {song: song, started: startedAt}}});
                }

                function skipSong() {
                    songs = Playlists.find({type: type}).fetch()[0].songs;
                    if (currentSong < (songs.length - 1)) {
                        currentSong++;
                    } else currentSong = 0;
                    songTimer();
                    addToHistory(songs[currentSong], startedAt);
                }

                function songTimer() {
                    startedAt = Date.now();
                    Meteor.setTimeout(function() {
                        skipSong();
                    }, songs[currentSong].duration * 1000);
                }

                songTimer();
            }
        }
    });
}

/*Router.waitOn(function() {
    Meteor.subscribe("isAdmin", Meteor.userId());
});*/

/*Router.onBeforeAction(function() {
    /*Meteor.autorun(function () {
        if (admin.ready()) {
            this.next();
        }
    });*/
    /*this.next();
});*/

Router.route("/", {
    template: "home"
});

Router.route("/terms", {
    template: "terms"
});

Router.route("/privacy", {
    template: "privacy"
});

Router.route("/admin", {
    waitOn: function() {
        return Meteor.subscribe("isAdmin", Meteor.userId());
    },
    action: function() {
        var user = Meteor.users.find({}).fetch();
        if (user[0] !== undefined && user[0].profile !== undefined && user[0].profile.rank === "admin") {
            this.render("admin");
        } else {
            this.redirect("/");
        }
    }
});

Router.route("/:type", {
    template: "room"
});
