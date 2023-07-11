const Command = require('../../base/Command.js');
const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');
const moment = require('moment');

class Rob extends Command {
  constructor(client) {
    super(client, {
      name: 'rob',
      description: 'Rob a player',
      category: 'Economy',
      usage: 'rob <user>',
      aliases: ['robbery'],
      guildOnly: true,
    });
  }

  async run(msg, text) {
    const errorColor = msg.settings.embedErrorColor;
    const type = 'rob';

    const cooldown = db.get(`servers.${msg.guild.id}.economy.${type}.cooldown`) || 600; // get cooldown from database or set to 600 seconds (10 minutes)
    let userCooldown = db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.${type}.cooldown`) || {};

    const authorName = msg.author.discriminator === '0' ? msg.author.username : msg.author.tag;
    const embed = new EmbedBuilder()
      .setColor(errorColor)
      .setAuthor({ name: authorName, iconURL: msg.author.displayAvatarURL() });

    if (userCooldown.active) {
      const timeleft = userCooldown.time - Date.now();
      if (timeleft < 0 || timeleft > cooldown * 1000) {
        userCooldown = {};
        userCooldown.active = false;
        db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.${type}.cooldown`, userCooldown);
      } else {
        const tLeft = moment
          .duration(timeleft)
          .format('y[ years][,] M[ Months]d[ days][,] h[ hours][,] m[ minutes][, and] s[ seconds]'); // format to any format

        embed.setDescription(`You cannot rob for ${tLeft}`);
        return msg.channel.send({ embeds: [embed] });
      }
    }

    if (!text || text.length < 1) {
      embed.setDescription(`Incorrect Usage: ${msg.settings.prefix}Rob <user>`);
      return msg.channel.send({ embeds: [embed] });
    }

    const mem = await this.client.util.getMember(msg, text.join(' '));

    if (!mem) {
      embed.setDescription(`That user was not found. \nUsage: ${msg.settings.prefix}Rob <user>`);
      return msg.channel.send({ embeds: [embed] });
    } else if (mem.id === msg.author.id) {
      embed.setDescription("You can't rob yourself.");
      return msg.channel.send({ embeds: [embed] });
    }

    const authCash = BigInt(
      db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`) ||
        db.get(`servers.${msg.guild.id}.economy.startBalance`) ||
        0,
    );
    const authBank = BigInt(db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.bank`) || 0);
    const authNet = authCash + authBank;

    const memCash = BigInt(
      db.get(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`) ||
        db.get(`servers.${msg.guild.id}.economy.startBalance`) ||
        0,
    );

    if (memCash <= BigInt(0)) {
      embed.setDescription(`${mem} does not have anything to rob.`);
      return msg.channel.send({ embeds: [embed] });
    }

    const totalAmount = Number(memCash + authNet);
    const failRate = Math.floor((Number(authNet) / totalAmount) * 100);

    const ranNum = Math.floor(Math.random() * 100);

    // Minimum fine is 10% of the amount of money the user has, maximum fine is 30% of the amount of money the user has
    const minFine = 10;
    const maxFine = 30;

    // randomFine is a random number between 10 and 30
    const randomFine = BigInt(Math.round(Math.random() * (maxFine - minFine + 1) + minFine));

    // fineAmount is the amount of money the user will lose if they fail the robbery
    const fineAmount = (authNet / BigInt(100)) * randomFine;

    const currencySymbol = db.get(`servers.${msg.guild.id}.economy.symbol`) || '$';

    if (failRate > BigInt(100)) {
      embed
        .setColor('#FFA500')
        .setDescription(
          'You networth is either too high, or the person you are trying to rob networth is too high. You cannot rob them.',
        );
      return msg.channel.send({ embeds: [embed] });
    }

    if (ranNum <= failRate) {
      const newAmount = authCash - fineAmount;
      db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, newAmount.toString());

      let csFineAmount = currencySymbol + fineAmount.toLocaleString();
      csFineAmount = csFineAmount.length > 1024 ? `${csFineAmount.slice(0, 1021) + '...'}` : csFineAmount;
      embed.setDescription(`You were caught attempting to rob ${mem.displayName} and have been fined ${csFineAmount}`);
      msg.channel.send({ embeds: [embed] });
    } else {
      // Lucky them, give them the money!
      const amount = BigInt(Math.floor(Math.random() * Number(memCash)) + 1);

      const newMemCash = memCash - amount;
      db.set(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`, newMemCash.toString());

      const newAuthCash = authCash + amount;
      db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, newAuthCash.toString());

      let csAmount = currencySymbol + amount.toLocaleString();
      csAmount = csAmount.length > 1024 ? `${csAmount.slice(0, 1021) + '...'}` : csAmount;
      let csAuthCash = currencySymbol + newAuthCash.toLocaleString();
      csAuthCash = csAuthCash.length > 1024 ? `${csAuthCash.slice(0, 1021) + '...'}` : csAuthCash;
      let csMemCash = currencySymbol + newMemCash.toLocaleString();
      csMemCash = csMemCash.length > 1024 ? `${csMemCash.slice(0, 1021) + '...'}` : csMemCash;

      embed
        .setColor('#64BC6C')
        .setDescription(`You successfully robbed ${mem} of ${csAmount}`)
        .addFields([
          {
            name: 'Your New Balance',
            value: `${csAuthCash}`,
          },
          {
            name: `${mem.displayName}'s New Balance`,
            value: `${csMemCash}`,
          },
        ]);
      msg.channel.send({ embeds: [embed] });
    }

    userCooldown.time = Date.now() + cooldown * 1000;
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
