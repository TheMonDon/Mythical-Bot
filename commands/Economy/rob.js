const Command = require('../../base/Command.js');
const { getMember } = require('../../util/Util.js');
const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');
const moment = require('moment');

class Rob extends Command {
  constructor (client) {
    super(client, {
      name: 'rob',
      description: 'Rob a player',
      category: 'Economy',
      usage: 'rob <user>',
      aliases: ['robbery'],
      guildOnly: true
    });
  }

  async run (msg, text) {
    let mem;
    const errorColor = msg.settings.embedErrorColor;

    const type = 'rob';

    const cooldown = db.get(`servers.${msg.guild.id}.economy.${type}.cooldown`) || 600; // get cooldown from database or set to 600 seconds (10 minutes)
    let userCooldown = db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.${type}.cooldown`) || {};

    if (userCooldown.active) {
      const timeleft = userCooldown.time - Date.now();
      if (timeleft < 0 || timeleft > (cooldown * 1000)) {
        userCooldown = {};
        userCooldown.active = false;
        db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.${type}.cooldown`, userCooldown);
      } else {
        const tLeft = moment.duration(timeleft)
          .format('y[ years][,] M[ Months]d[ days][,] h[ hours][,] m[ minutes][, and] s[ seconds]'); // format to any format
        const embed = new EmbedBuilder()
          .setColor(errorColor)
          .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
          .setDescription(`You cannot rob for ${tLeft}`);
        return msg.channel.send({ embeds: [embed] });
      }
    }

    if (!text || text.length < 1) {
      const embed = new EmbedBuilder()
        .setColor(errorColor)
        .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
        .setDescription(`Incorrect Usage: ${msg.settings.prefix}Rob <user>`);
      return msg.channel.send({ embeds: [embed] });
    } else {
      mem = await getMember(msg, text.join(' '));
    }

    if (!mem) {
      const embed = new EmbedBuilder()
        .setColor(errorColor)
        .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
        .setDescription(`That user was not found. \nUsage: ${msg.settings.prefix}Rob <user>`);
      return msg.channel.send({ embeds: [embed] });
    } else if (mem.id === msg.author.id) {
      const embed = new EmbedBuilder()
        .setColor(errorColor)
        .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
        .setDescription('You can\'t rob yourself.');
      return msg.channel.send({ embeds: [embed] });
    }

    const authCash = parseFloat(db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`) || db.get(`servers.${msg.guild.id}.economy.startBalance`) || 0);
    const authBank = parseFloat(db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.bank`) || 0);
    const authNet = authCash + authBank;

    const memCash = parseFloat(db.get(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`) || db.get(`servers.${msg.guild.id}.economy.startBalance`) || 0);

    if (memCash <= 0) {
      const embed = new EmbedBuilder()
        .setColor(errorColor)
        .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
        .setDescription(`${mem} does not have anything to rob.`);
      return msg.channel.send({ embeds: [embed] });
    }

    let failRate;
    if (authNet >= Number.MAX_VALUE || authNet >= Infinity) {
      failRate = 101;
    } else if ((memCash + authNet) >= Number.MAX_VALUE || (memCash + authNet) >= Infinity) {
      failRate = 101;
    } else if (isNaN(authNet) || isNaN(memCash)) {
      failRate = 101;
    } else {
      failRate = (authNet / (memCash + authNet)) * 100;
    }
    const ranNum = Math.random() * 100;

    // Minimum fine is 10% of the amount of money the user has, maximum fine is 30% of the amount of money the user has
    const minFine = 10;
    const maxFine = 30;

    // randomFine is a random number between 10 and 30
    const randomFine = parseInt(Math.round(Math.random() * (maxFine - minFine + 1) + minFine));

    // fineAmnt is the amount of money the user will lose if they fail the robbery
    const fineAmnt = parseInt(Math.floor((authNet / 100) * randomFine));

    const currencySymbol = db.get(`servers.${msg.guild.id}.economy.symbol`) || '$';

    if (failRate > 100) {
      const em = new EmbedBuilder()
        .setColor('#FFA500')
        .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
        .setDescription('You networth is either too high, or the person you are trying to rob networth is too high. You cannot rob them.');
      return msg.channel.send({ embeds: [em] });
    }
    if (ranNum < failRate) {
      db.subtract(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, fineAmnt);

      const em = new EmbedBuilder()
        .setColor(errorColor)
        .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
        .setDescription(`You were caught attempting to rob ${mem.displayName} and have been fined ${currencySymbol + fineAmnt.toLocaleString()}`);
      msg.channel.send({ embeds: [em] });
    } else {
      // Lucky then, give them the money!
      const amnt = parseInt(Math.floor(Math.random() * memCash) + 1);

      db.subtract(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`, amnt);
      db.add(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, amnt);

      const embed = new EmbedBuilder()
        .setColor(msg.settings.embedColor)
        .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
        .setDescription(`You successfully robbed ${mem} of ${currencySymbol}${amnt.toLocaleString()}`)
        .addFields([
          { name: 'Your New Balance', value: `${currencySymbol}${db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`).toLocaleString()}` },
          { name: `${mem.displayName}'s New Balance`, value: `${currencySymbol}${db.get(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`).toLocaleString()}` }
        ]);
      msg.channel.send({ embeds: [embed] });
    }

    userCooldown.time = Date.now() + (cooldown * 1000);
    userCooldown.active = true;
    db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.${type}.cooldown`, userCooldown);

    setTimeout(() => {
      userCooldown = {};
      userCooldown.active = false;
      db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.${type}.cooldown`, userCooldown);
    }, cooldown * 1000);
  }
}

module.exports = Rob;
