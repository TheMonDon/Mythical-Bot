const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const moment = require('moment');
require('moment-duration-format');
const db = require('quick.db');

module.exports = class CrimeCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'crime',
      category: 'Economy',
      description: 'Commit a crime',
      examples: ['crime'],
      guildOnly: true
    });
  }

  run (msg) {
    const server = msg.guild;
    const member = msg.member;

    const type = 'crime';

    const cooldown = db.get(`servers.${server.id}.economy.${type}.cooldown`) || 600;
    let userCooldown = db.get(`servers.${server.id}.users.${member.id}.economy.${type}.cooldown`) || {};

    if (userCooldown.active) {
      const timeleft = userCooldown.time - Date.now();
      if (timeleft < 0 || timeleft > (cooldown * 1000)) {
        // this is to check if the bot restarted before their cooldown was set.
        userCooldown = {};
        userCooldown.active = false;
        db.set(`servers.${server.id}.users.${member.id}.economy.${type}.cooldown`, userCooldown);
      } else {
        const tLeft = moment.duration(timeleft)
          .format('y[ years][,] M[ Months]d[ days][,] h[ hours][,] m[ minutes][, and] s[ seconds]'); // format to any format
        const embed = new DiscordJS.MessageEmbed()
          .setColor('#EC5454')
          .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
          .setDescription(`You cannot commit a crime for ${tLeft}`);
        return msg.channel.send(embed);
      }
    }

    const cash = db.get(`servers.${server.id}.users.${member.id}.economy.cash`) || db.get(`servers.${msg.guild.id}.economy.startBalance`) || 0;
    const bank = db.get(`servers.${server.id}.users.${member.id}.economy.bank`) || 0;
    const authNet = cash + bank;

    const min = db.get(`servers.${server.id}.economy.${type}.min`) || 500;
    const max = db.get(`servers.${server.id}.economy.${type}.max`) || 2000;

    const minFine = db.get(`servers.${server.id}.economy.${type}.fine.min`) || 10;
    const maxFine = db.get(`servers.${server.id}.economy.${type}.fine.max`) || 30; // these are %s

    // I don't really understand how this works LMAO
    const randomFine = parseInt(Math.min(Math.max(Math.floor(Math.random() * maxFine), minFine), maxFine), 10);
    const fineAmnt = parseInt(authNet * (randomFine / 100), 10);

    const failRate = db.get(`servers.${server.id}.economy.${type}.failrate`) || 45;
    const ranNum = Math.random() * 100;

    const cs = db.get(`servers.${server.id}.economy.symbol`) || '$'; // get economy symbol

    delete require.cache[require.resolve('../../resources/messages/crime_success.json')];
    delete require.cache[require.resolve('../../resources/messages/crime_fail.json')];
    const crimeSuccess = require('../../resources/messages/crime_success.json');
    const crimeFail = require('../../resources/messages/crime_fail.json');

    if (ranNum < failRate) {
      if (isNaN(fineAmnt)) {
        return msg.channel.send('You have too much money to be able to be fined.');
      }
      const csamount = cs + fineAmnt.toLocaleString();
      const num = Math.floor(Math.random() * (crimeFail.length - 1)) + 1;
      const txt = crimeFail[num].replace('csamount', csamount);

      const embed = new DiscordJS.MessageEmbed()
        .setColor('#EC5454')
        .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
        .setDescription(txt)
        .setFooter(`Reply #${num.toLocaleString()}`);
      msg.channel.send(embed);

      db.subtract(`servers.${server.id}.users.${member.id}.economy.cash`, fineAmnt);
    } else {
      const amount = Math.floor(Math.random() * (max - min + 1) + min);
      const csamount = cs + amount.toLocaleString();

      const num = Math.floor(Math.random() * (crimeSuccess.length - 1)) + 1;
      const txt = crimeSuccess[num].replace('csamount', csamount);

      const embed = new DiscordJS.MessageEmbed()
        .setColor('#04ACF4')
        .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
        .setDescription(txt)
        .setFooter(`Reply #${num.toLocaleString()}`);
      msg.channel.send(embed);

      db.add(`servers.${server.id}.users.${member.id}.economy.cash`, amount);
    }

    userCooldown.time = Date.now() + (cooldown * 1000);
    userCooldown.active = true;
    db.set(`servers.${server.id}.users.${member.id}.economy.${type}.cooldown`, userCooldown);

    setTimeout(() => {
      userCooldown = {};
      userCooldown.active = false;
      db.set(`servers.${server.id}.users.${member.id}.economy.${type}.cooldown`, userCooldown);
    }, cooldown * 1000);
  }
};
