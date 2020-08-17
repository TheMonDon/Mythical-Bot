/* eslint-disable no-inner-declarations */
const Command = require('../../base/Command.js');
const Discord = require('discord.js');
const db = require('quick.db');
const Canvas = require('canvas');
const request = require('node-superfetch');

class Rank extends Command {
  constructor (client) {
    super(client, {
      name: 'rank',
      description: 'Sends a rank card for you or the mentioned userd',
      category: 'Levels',
      usage: '<optional mention a user> you can also use <prefix>rank --background <url to set the background image> --color <hex code>',
      aliases: ['level']
    });
  }

  async run (msg, args, level) { // eslint-disable-line no-unused-vars
    const message = msg;

    if (!message.guild.me.hasPermission('EMBED_LINKS')) return message.reply('I do not have required permissions');
    if (!message.guild.me.hasPermission('ATTACH_FILES')) return message.reply('I do not have required permissions');
    if (!message.guild.me.hasPermission('CONNECT')) return message.reply('I do not have required permissions');
    if (!message.guild.me.hasPermission('SPEAK')) return message.reply('I do not have required permissions');
    if (!message.guild.me.hasPermission('ADD_REACTIONS')) return message.reply('I do not have required permissions');
    let xpo = db.fetch(`xpo1_${message.guild.id}`);
    if (!xpo) xpo = 'off';
    if (xpo === 'off')
      return message.reply(
        'Im sorry but xp is turned off for this server turn it on to view xp'
      );
    const user =
        message.mentions.members.first() ||
        message.guild.members.cache.get(args[0]) ||
        message.member;
    if (args[0] === '--background') {
     
     
      
      const fish = args[1];
      const image = message.attachments.first();
      if (!image && fish !== 'default') return message.reply('Please include image');
    
      
      if (args[1] === 'default') {
        db.set(
          `background_${message.guild.id}_${message.author.id}`,
          'https://lh3.googleusercontent.com/eECNmNm9OnZdfwKtdFIc-uKkcfqfKOZjjh1KXk_AnQw0NsyU-tkqHXVT64NULS92C9_VzR2HKQ=w640-h400-e365'
        );
        message.channel.send('Background set to default');
      } else {
        
        
      
        db.set(`background_${message.guild.id}_${message.author.id}`, image.url);
        message.channel.send(
          new Discord.MessageEmbed()
            .setDescription('Rank background set to')
            .setColor('#FF9966')
            .setImage(image.url)
        );
          
    
      }
    } else if (args[0] === '--color') {
      const myRegex = /^[0-9A-F]{6}$/i;
      if (myRegex.test(args[1]) === false && args[1] !== 'default')
        return message.reply('that is not a vaild hex code');
      const fish = args[1];
      if (!fish) return message.reply('Please include a hex code');
    
      
      if (args[1] === 'default') {
        db.set(
          `color_${message.guild.id}_${message.author.id}`,
          '#FFFFFF'
        );
        message.channel.send('Color set to default');
      } else {
         
        db.set(`color_${message.guild.id}_${message.author.id}`, '#'+fish);
        message.channel.send(
          new Discord.MessageEmbed()
            .setDescription('Rank color set to' + '\n' + `> #${fish}`)
            .setColor('#FF9966')
               
        );
          
       
      }
        
    } else {
         
      message.channel.startTyping();
      const xp = db.fetch(`xp4_${message.guild.id}_${user.id}`);
         
      let xpl = db.fetch(`xpl4_${message.guild.id}_${user.id}`);
       
      let nxtl = db.fetch(`nxtl4_${message.guild.id}_${user.id}`);
      if (!nxtl) nxtl = 300;
      if (!xpl) xpl = 0;
      const difference = nxtl - xp;
      if (user.user.bot) return message.reply('Bot\'s can\'t have a rank silly').then(message.channel.stopTyping());
      if (!xp) return message.reply('No xp found').then(message.channel.stopTyping());
      let background1 = db.fetch(`background_${message.guild.id}_${user.id}`);
      let color1 = db.fetch(`color_${message.guild.id}_${user.id}`);
      if (!color1) color1 = '#FFFFFF';
      if (!background1)
        background1 =
            'https://lh3.googleusercontent.com/eECNmNm9OnZdfwKtdFIc-uKkcfqfKOZjjh1KXk_AnQw0NsyU-tkqHXVT64NULS92C9_VzR2HKQ=w640-h400-e365';
      const canvas = Canvas.createCanvas(1000, 333);
      const ctx = canvas.getContext('2d');
      function roundRect (
        ctx,
        x,
        y,
        width,
        height,
        radius,
        fill,
        stroke,
        fillstyle
      ) {
        if (typeof stroke === 'undefined') {
          stroke = true;
        }
        if (typeof radius === 'undefined') {
          radius = 5;
        }
        if (typeof radius === 'number') {
          radius = { tl: radius, tr: radius, br: radius, bl: radius };
        } else {
          var defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 };
          for (var side in defaultRadius) {
            radius[side] = radius[side] || defaultRadius[side];
          }
        }
        ctx.beginPath();
        ctx.moveTo(x + radius.tl, y);
        ctx.lineTo(x + width - radius.tr, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
        ctx.lineTo(x + width, y + height - radius.br);
        ctx.quadraticCurveTo(
          x + width,
          y + height,
          x + width - radius.br,
          y + height
        );
        ctx.lineTo(x + radius.bl, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
        ctx.lineTo(x, y + radius.tl);
        ctx.quadraticCurveTo(x, y, x + radius.tl, y);
        ctx.closePath();
        if (fill) {
          ctx.fillStyle = fillstyle;
          ctx.fill();
        }
        if (stroke) {
          ctx.stroke();
        }
      }
      try {
        const background = await Canvas.loadImage(background1);
        ctx.drawImage(background, 0, 0, 1000, 333);
      } catch (err) {
        message.channel.send(err).then(message.channel.stopTyping());
      }
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(20, 20, 960, 300);
      const avatar_x = 50;
      const avatar_y = 70;
      const diameter = 200;
      const halfsize = diameter / 2;
      const shadow_size = 2;
      const shading_color = 'rgba(0,0,0,0.5)';
      const color = 'rgba(255,255,255, 0.5)';
      // add user avatar bg shadow
      ctx.save();
      ctx.beginPath();
      const sx = avatar_x + halfsize,
        sy = avatar_y + halfsize;
      ctx.arc(sx, sy, halfsize - shadow_size, 0, 2 * Math.PI, true);
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle = shading_color;
      ctx.fillRect(avatar_x, avatar_y, diameter, diameter);
      ctx.restore();
      // add user avatar
      ctx.save();
      ctx.beginPath();
      ctx.arc(sx, sy, halfsize - shadow_size * 2, 0, 2 * Math.PI, true);
      ctx.closePath();
      ctx.clip();
      const url = user.user.avatarURL({
        format: 'png',
        size: 1024
      });
      const img = await Canvas.loadImage(url);
    
      ctx.drawImage(img, avatar_x, avatar_y, diameter, diameter);
      ctx.restore();
    
      ctx.save();
      const fixXp = (ctx, canvas, value) => {
        if (value >= 1000000) {
          value = parseInt(value / 1000000) + 'M';
        } else if (value >= 1000) {
          value = parseInt(value / 1000) + 'K';
        } else if (value >= 100000) {
          value = parseInt(value / 100000) + 'K';
        }
        return value;
      };
      const level = `Level: ${xpl}`;
      const bigboi = ctx.measureText(level).width;
      const outof = fixXp(ctx, canvas, xp);
      const inof = fixXp(ctx, canvas, nxtl);
      ctx.font = '30px Aerial';
      ctx.fillStyle = color1;
       
      ctx.fillText(user.user.tag.toUpperCase(), 250, 140);
      ctx.fillText(`${level}`, 250, 210);
      ctx.fillText(`${outof} / ${inof}`, bigboi + 700, 210);
      ctx.strokeStyle = color;
      roundRect(ctx, 230, 220, 650, 40, 20, false, true, color);
      roundRect(ctx, 230, 220, 650, 40, 20, true, false, 'rgba(255,255,255, 0.4)');
    
      roundRect(
        ctx,
        230,
        220,
        (100 / nxtl) * xp * 6.5,
        40,
        20,
        true,
        false,
        color
      );
    
      const filename = 'rank.png';
      const attachment = new Discord.MessageAttachment(
        canvas.toBuffer(),
        filename
      );
      message.channel.send(attachment).then(message.channel.stopTyping());
    }
  }
}

module.exports = Rank;
