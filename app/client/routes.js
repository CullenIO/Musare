Router.configure({
    loadingTemplate: 'loading'
});

Router.onBeforeAction(function() {
    var self = this;
    var next = self.next;
    if (Meteor.userId()) {
        Meteor.call("isBanned", function(err, res) {
            if (res) {
                self.render('banned');
                pause();
            } else {
                next();
            }
        });
    } else {
        next();
    }
});

Router.route("/", {
    template: "home"
});

Router.route("/login", {
    action: function() {
        var user = Meteor.user();
        if (user === undefined || user === null) {
            this.render("login");
        } else {
            this.redirect("/");
        }
    }
});

Router.route("/signup", {
    action: function() {
        var user = Meteor.user();
        if (user === undefined || user === null) {
            this.render("register");
        } else {
            this.redirect("/");
        }
    }
});

Router.route("/settings", {
    action: function() {
        if (!Meteor.userId()) {
            this.redirect("/");
        } else {
            this.render("settings");
        }
    }
});

Router.route("/terms", {
    template: "terms"
});

Router.route("/contact", {
    template: "contact"
});

Router.route("/faq", {
    template: "faq"
});

Router.route("/privacy", {
    template: "privacy"
});

Router.route("/about", {
    template: "about"
});

Router.route("/admin", {
    waitOn: function() {
        return Meteor.subscribe("isAdmin", Meteor.userId());
    },
    action: function() {
        var user = Meteor.users.findOne({});
        if (user !== undefined && user.profile !== undefined && user.profile.rank === "admin") {
            this.render("admin");
        } else {
            this.redirect("/");
        }
    }
});

Router.route("/admin/stations", {
    waitOn: function() {
        return Meteor.subscribe("isAdmin", Meteor.userId());
    },
    action: function() {
      var user = Meteor.users.findOne({});
      if (user !== undefined && user.profile !== undefined && user.profile.rank === "admin") {
          this.render("stations");
      } else {
          this.redirect("/");
      }
    }
});

Router.route("/admin/alerts", {
    waitOn: function() {
        return Meteor.subscribe("isAdmin", Meteor.userId());
    },
    action: function() {
        var user = Meteor.users.findOne({});
        if (user !== undefined && user.profile !== undefined && user.profile.rank === "admin") {
            this.render("alertsDashboard");
        } else {
            this.redirect("/");
        }
    }
});

Router.route("/:type", {
    template: "room"
});

Router.route("/u/:user", {
    template: "profile"
});

Router.route("/admin/queues", {
  template: "queues"
});
