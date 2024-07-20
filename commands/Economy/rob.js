const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const moment = require('moment');
const db = new QuickDB();

class Rob extends Command {
  constructor(client) {
    super(client, {
      name: 'rob',
      description: 'Rob a player',
      category: 'Economy',
      usage: 'rob <user>',
      aliases: ['robbery'],
      requiredArgs: 1,
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const errorColor = msg.settings.embedErrorColor;
    const type = 'rob';

    const cooldown = (await db.get(`servers.${msg.guild.id}.economy.${type}.cooldown`)) || 600; // get cooldown from database or set to 600 seconds (10 minutes)
    let userCooldown = (await db.get(`servers.${msg.guild.id}.users.${msg.author.id}.economy.${type}.cooldown`)) || {};

    const embed = new EmbedBuilder()
      .setColor(errorColor)
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() });

    // Check if the user is on cooldown
    if (userCooldown.active) {
      const timeleft = userCooldown.time - Date.now();
      if (timeleft <= 1 || timeleft > cooldown * 1000) {
        userCooldown = {};
        userCooldown.active = false;
        await db.set(`servers.${msg.guild.id}.users.${msg.author.id}.economy.${type}.cooldown`, userCooldown);
      } else {
        const tLeft = moment
          .duration(timeleft)
          .format('y[ years][,] M[ Months]d[ days][,] h[ hours][,] m[ minutes][, and] s[ seconds]'); // format to any format

        embed.setDescription(`You cannot rob for ${tLeft}`);
        return msg.channel.send({ embeds: [embed] });
      }
    }

    let mem = await this.client.util.getMember(msg, args.join(' '));

    if (!mem) {
      // If no member is found, try to get the user by ID
      const findId = args.join(' ').toLowerCase().replace(/<@|>/g, '');
      try {
        mem = await this.client.users.fetch(findId, { force: true });
      } catch (err) {
        // If no user is found, use the author
        mem = msg.member;
        mem = await mem.user.fetch();
      }
    }

    if (!mem) return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid Member');
    if (mem.id === msg.author.id) return this.client.util.errorEmbed(msg, "You can't rob yourself.", 'Invalid Member');

    const authCash = BigInt(
      (await db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`)) ||
        (await db.get(`servers.${msg.guild.id}.economy.startBalance`)) ||
        0,
    );
    const authBank = BigInt((await db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.bank`)) || 0);
    const authNet = authCash + authBank;

    const memCash = BigInt(
      (await db.get(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`)) ||
        (await db.get(`servers.${msg.guild.id}.economy.startBalance`)) ||
        0,
    );

    if (memCash <= BigInt(0))
      return this.client.util.errorEmbed(msg, `${mem} does not have anything to rob`, 'No Money');

    const minRate = 20;
    const maxRate = 80;

    const totalAmount = Number(memCash + authNet);
    const failRate = Math.floor((Number(authNet) / totalAmount) * (maxRate - minRate + 1) + minRate);

    const ranNum = Math.floor(Math.random() * 100);

    // Minimum fine is 10% of the amount of money the user has, maximum fine is 30% of the amount of money the user has
    const minFine = (await db.get(`servers.${msg.guild.id}.economy.crime.fine.min`)) || 10;
    const maxFine = (await db.get(`servers.${msg.guild.id}.economy.crime.fine.max`)) || 30;

    // randomFine is a random number between 10 and 30
    const randomFine = BigInt(Math.round(Math.random() * (maxFine - minFine + 1) + minFine));

    // fineAmount is the amount of money the user will lose if they fail the robbery
    const fineAmount = bigIntAbs((authNet / BigInt(100)) * randomFine);

    const currencySymbol = (await db.get(`servers.${msg.guild.id}.economy.symbol`)) || '$';

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
      await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, newAmount.toString());

      let csFineAmount = currencySymbol + fineAmount.toLocaleString();
      csFineAmount = csFineAmount.length > 1024 ? `${csFineAmount.slice(0, 1021) + '...'}` : csFineAmount;
      embed.setDescription(`You were caught attempting to rob ${mem} and have been fined **${csFineAmount}**`);
      msg.channel.send({ embeds: [embed] });
    } else {
      // Calculate a random amount to rob, without exceeding extremely large values
      const maxRobAmount = Math.min(Number(memCash), Number.MAX_SAFE_INTEGER);
      let amount = Math.floor((failRate / 100) * maxRobAmount);
      amount = BigInt(amount);

      const newMemCash = memCash - amount;
      await db.set(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`, newMemCash.toString());

      const newAuthCash = authCash + amount;
      await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, newAuthCash.toString());

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
    await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.${type}.cooldown`, userCooldown);

    setTimeout(async () => {
      userCooldown = {};
      userCooldown.active = false;
      await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.${type}.cooldown`, userCooldown);
    }, cooldown * 1000);
  }
}

// Custom BigInt absolute function
function bigIntAbs(value) {
  return value < 0n ? -value : value;
}

module.exports = Rob;
