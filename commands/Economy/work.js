const Command = require('../../base/Command.js');
const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');
const moment = require('moment');

class Work extends Command {
  constructor(client) {
    super(client, {
      name: 'work',
      category: 'Economy',
      description: 'Get money by working',
      usage: 'work',
      guildOnly: true,
    });
  }

  run(msg) {
    const cooldown = db.get(`servers.${msg.guild.id}.economy.work.cooldown`) || 300; // get cooldown from database or set to 300 seconds
    let userCooldown = db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.work.cooldown`) || {};

    const authorName = msg.author.discriminator === '0' ? msg.author.username : msg.author.tag;
    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedErrorColor)
      .setAuthor({ name: authorName, iconURL: msg.author.displayAvatarURL() });

    if (userCooldown.active) {
      const timeleft = userCooldown.time - Date.now();
      if (timeleft < 0 || timeleft > cooldown * 1000) {
        userCooldown = {};
        userCooldown.active = false;
        db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.work.cooldown`, userCooldown);
      } else {
        const tLeft = moment
          .duration(timeleft)
          .format('y[ years][,] M[ Months]d[ days][,] h[ hours][,] m[ minutes][, and] s[ seconds]');
        embed.setDescription(`You cannot work for ${tLeft}`);
        return msg.channel.send({ embeds: [embed] });
      }
    }

    const min = BigInt(db.get(`servers.${msg.guild.id}.economy.work.min`) || 50);
    const max = BigInt(db.get(`servers.${msg.guild.id}.economy.work.max`) || 500);

    const amount = Math.floor(Math.random() * (max - min + 1) + min);
    const currencySymbol = db.get(`servers.${msg.guild.id}.economy.symbol`) || '$';
    const csamount = currencySymbol + amount.toLocaleString();

    delete require.cache[require.resolve('../../resources/messages/work_jobs.json')];
    const jobs = require('../../resources/messages/work_jobs.json');

    const num = Math.floor(Math.random() * (jobs.length - 1)) + 1;
    const job = jobs[num].replace('csamount', csamount);

    userCooldown.time = Date.now() + cooldown * 1000;
    userCooldown.active = true;
    db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.work.cooldown`, userCooldown);

    const oldBalance = BigInt(
      db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`) ||
        db.get(`servers.${msg.guild.id}.economy.startBalance`) ||
        0,
    );
    const newBalance = oldBalance + BigInt(amount);

    db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, newBalance.toString());

    embed
      .setColor('#64BC6C')
      .setDescription(job)
      .setFooter({ text: `Reply #${num.toLocaleString()}` });
    msg.channel.send({ embeds: [embed] });

    setTimeout(() => {
      userCooldown = {};
      userCooldown.active = false;
      db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.work.cooldown`, userCooldown);
    }, cooldown * 1000);
  }
}

module.exports = Work;
