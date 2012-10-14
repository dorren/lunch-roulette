$(function() {
  var Item = Backbone.Model.extend({
    initialize: function(){
    },

    clear: function() {
      this.destroy(); // remove from local storage
    }
  });

  var Items = Backbone.Collection.extend({
    model: Item,
    localStorage: new Store("roulette")
  });


  var ItemView = Backbone.View.extend({
    tagName:  "li",

    template: _.template("<%= name %> <a class='destroy'>&#215;</a>"),

    events: {
      "click a.destroy" : "clear",
    },

    initialize: function() {
      this.model.bind('destroy', this.remove, this);
    },

    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      return this;
    },

    clear: function(){
      this.model.clear();
    }
  });

  var Wheel = Backbone.View.extend({
    el: "#widget",
    colors: ["#B8D430", "#3AB745", "#029990", "#3501CB",
             "#2E2C75", "#673A7E", "#CC0071", "#F80120",
             "#F35B20", "#FB9A00", "#FFCC00", "#FEF200"],
    startAngle: 0,
    arc: null,
    spinTimeout: null,
    spinArcStart: 10,
    spinTime: 0,
    spinTimeTotal: 0,
    ctx: null,
    spin_snd: new Audio("images/spin.mp3"),

    events: {
      "keypress .new-item":  "createOnEnter",
      "click .spin-btn": "spin"
    },

    initialize: function(items) {
      this.spin_snd.preload = 'auto';
      this.spin_snd.load();
      this.input = this.$(".new-item");
      this.spin_btn = this.$(".spin-btn");
      this.wheel = this.$("#wheel")[0];

      this.items = items;
      this.items.bind('add', this.addOne, this);
      this.items.bind('remove', this.render, this);

      this.items.fetch(); // load from local storage

      // populate left side list
      _.each(this.items.models, function(item){
        var view = new ItemView({model: item});
        this.$("#items-list").append(view.render().el);
      });
    },

    createOnEnter: function(e) {
      if (e.keyCode != 13) return;
      if (!this.input.val()) return;

      this.items.create({name: this.input.val()});
      this.input.val('');
    },

    addOne: function(item) {
      var view = new ItemView({model: item});
      item.save();
      this.$("#items-list").append(view.render().el); // add new item to the left

      this.render();  // redraw the wheel
    },

    render: function() {
      if(this.items.length < 2){
        this.spin_btn.hide();
        this.wheel.width = this.wheel.width; // clear canvas
      }else{
        this.spin_btn.show();
        this.drawRouletteWheel();
      }
    },

    drawRouletteWheel: function(){
      this.arc = 2 * Math.PI / this.items.length;

      var canvas = this.wheel; //$(this.el)[0];
      if (canvas.getContext) {
        var outsideRadius = 200;
        var textRadius = 160;
        var insideRadius = 125;
        
        this.ctx = canvas.getContext("2d");
        this.ctx.clearRect(0,0,500,500);
        
        
        this.ctx.strokeStyle = "black";
        this.ctx.lineWidth = 2;
        
        this.ctx.font = 'bold 12px sans-serif';
        
        for(var i = 0; i < this.items.length; i++) {
          var angle = this.startAngle + i * this.arc;
          this.ctx.fillStyle = this.colors[i % this.colors.length];
          
          this.ctx.beginPath();
          this.ctx.arc(250, 250, outsideRadius, angle, angle + this.arc, false);
          this.ctx.arc(250, 250, insideRadius, angle + this.arc, angle, true);
          this.ctx.stroke();
          this.ctx.fill();
          
          this.ctx.save();
          this.ctx.shadowOffsetX = -1;
          this.ctx.shadowOffsetY = -1;
          this.ctx.shadowBlur    = 0;
          // ctx.shadowColor   = "rgb(220,220,220)";
          this.ctx.fillStyle = "white";
          this.ctx.translate(250 + Math.cos(angle + this.arc / 2) * textRadius, 250 + Math.sin(angle + this.arc / 2) * textRadius);
          this.ctx.rotate(angle + this.arc / 2 + Math.PI / 2);
          var text = this.items.at(i).get("name");
          this.ctx.fillText(text, -this.ctx.measureText(text).width / 2, 0);
          this.ctx.restore();
        } 
        
        //Arrow
        this.ctx.fillStyle = "black";
        this.ctx.beginPath();
        this.ctx.moveTo(250 - 4, 250 - (outsideRadius + 5));
        this.ctx.lineTo(250 + 4, 250 - (outsideRadius + 5));
        this.ctx.lineTo(250 + 4, 250 - (outsideRadius - 5));
        this.ctx.lineTo(250 + 9, 250 - (outsideRadius - 5));
        this.ctx.lineTo(250 + 0, 250 - (outsideRadius - 13));
        this.ctx.lineTo(250 - 9, 250 - (outsideRadius - 5));
        this.ctx.lineTo(250 - 4, 250 - (outsideRadius - 5));
        this.ctx.lineTo(250 - 4, 250 - (outsideRadius + 5));
        this.ctx.fill();
      }
      return this;
    },

    spin: function() {
      this.spinAngleStart = Math.random() * 10 + 10;
      this.spinTime = 0;
      // spinTimeTotal = Math.random() * 3 + 4 * 1000;
      this.spinTimeTotal = 15 * 1000;
      this.spin_snd.play();
      this.rotateWheel();
    },

    rotateWheel: function() {
      this.spinTime += 30;
      if(this.spinTime >= this.spinTimeTotal) {
        this.stopRotateWheel();
        return;
      }
      var spinAngle = this.spinAngleStart - this.easeOut(this.spinTime, 0, this.spinAngleStart, this.spinTimeTotal);
      this.startAngle += (spinAngle * Math.PI / 180);
      this.drawRouletteWheel();
      this.spinTimeout = setTimeout('window.wheel_obj.rotateWheel()', 30);
    },

    stopRotateWheel: function() {
      clearTimeout(this.spinTimeout);
      var degrees = this.startAngle * 180 / Math.PI + 90;
      var arcd = this.arc * 180 / Math.PI;
      var index = Math.floor((360 - degrees % 360) / arcd);
      this.ctx.save();
      this.ctx.font = 'bold 30px sans-serif';
      var text = this.items.at(index).get("name");
      this.ctx.fillText(text, 250 - this.ctx.measureText(text).width / 2, 250 + 10);
      this.ctx.restore();
    },

    easeOut: function(t, b, c, d) {
      var ts = (t/=d)*t;
      var tc = ts*t;
      return b+c*(tc + -3*ts + 3*t);
    }
  });

  var items_col = new Items;
  window.wheel_obj = new Wheel(items_col);
  window.wheel_obj.render();
});
