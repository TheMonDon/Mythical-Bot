const Command = require('../../base/Command.js');
const db = require('quick.db');
const DiscordJS = require('discord.js');
const moment = require('moment');

module.exports = class work extends Command {
  constructor (client) {
    super(client, {
      name: 'work',
      category: 'Economy',
      description: 'Get money by working',
      usage: 'work',
      guildOnly: true
    });
  }

  run (msg) {
    const member = msg.member;

    const cooldown = db.get(`servers.${msg.guild.id}.economy.work.cooldown`) || 300; // get cooldown from database or set to 300 seconds
    let userCooldown = db.get(`servers.${msg.guild.id}.users.${member.id}.economy.work.cooldown`) || {};

    if (userCooldown.active) {
      const timeleft = userCooldown.time - Date.now();
      if (timeleft < 0 || timeleft > (cooldown * 1000)) {
        userCooldown = {};
        userCooldown.active = false;
        db.set(`servers.${msg.guild.id}.users.${member.id}.economy.work.cooldown`, userCooldown);
      } else {
        const tLeft = moment.duration(timeleft)
          .format('y[ years][,] M[ Months]d[ days][,] h[ hours][,] m[ minutes][, and] s[ seconds]');
        const embed = new DiscordJS.MessageEmbed()
          .setColor('#EC5454')
          .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
          .setDescription(`You cannot work for ${tLeft}`);
        return msg.channel.send({embeds: [embed]});
      }
    }

    const min = db.get(`servers.${msg.guild.id}.economy.work.min`) || 50;
    const max = db.get(`servers.${msg.guild.id}.economy.work.max`) || 500;

    const amount = Math.floor(Math.random() * (max - min + 1) + min);
    const cs = db.get(`servers.${msg.guild.id}.economy.symbol`) || '$';
    const csamount = cs + amount.toLocaleString();

    delete require.cache[require.resolve('../../resources/messages/work_jobs.json')];
    const jobs = require('../../resources/messages/work_jobs.json');

    const num = Math.floor(Math.random() * (jobs.length - 1)) + 1;
    const job = jobs[num].replace('csamount', csamount);

    userCooldown.time = Date.now() + (cooldown * 1000);
    userCooldown.active = true;
    db.set(`servers.${msg.guild.id}.users.${member.id}.economy.work.cooldown`, userCooldown);

    let newBalance = db.get(`servers.${msg.guild.id}.users.${member.id}.economy.cash`) || db.get(`servers.${msg.guild.id}.economy.startBalance`) || 0;
    newBalance = newBalance + amount;

    db.set(`servers.${msg.guild.id}.users.${member.id}.economy.cash`, newBalance);

    const embed = new DiscordJS.MessageEmbed()
      .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
      .setColor('#64BC6C')
      .setDescription(job)
      .setFooter(`Reply #${num.toLocaleString()}`);
    msg.channel.send({embeds: [embed]});

    setTimeout(() => {
      userCooldown = {};
      userCooldown.active = false;
      db.set(`servers.${msg.guild.id}.users.${member.id}.economy.work.cooldown`, userCooldown);
    }, cooldown * 1000);
  }
};
