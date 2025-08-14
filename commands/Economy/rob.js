const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const moment = require('moment');
const db = new QuickDB();

class Rob extends Command {
  constructor(client) {
    super(client, {
      name: 'rob',
      description: 'Rob another users money',
      category: 'Economy',
      usage: 'rob <user>',
      aliases: ['robbery'],
      requiredArgs: 1,
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const connection = await this.client.db.getConnection();

    const [cooldownRows] = await connection.execute(
      /* sql */ `
        SELECT
          duration
        FROM
          cooldown_settings
        WHERE
          guild_id = ?
          AND cooldown_name = 'rob'
      `,
      [msg.guild.id],
    );
    const cooldown = cooldownRows[0]?.duration || 600;

    const [userCooldownRows] = await connection.execute(
      /* sql */ `
        SELECT
          *
        FROM
          cooldowns
        WHERE
          user_id = ?
          AND cooldown_name = 'rob'
          AND expires_at > NOW()
      `,
      [msg.author.id],
    );
    const expiresAt = userCooldownRows[0]?.expires_at;

    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedErrorColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() });

    // Check if the user is on cooldown
    if (expiresAt) {
      const timeleft = new Date(expiresAt) - Date.now();
      if (timeleft > 0 && timeleft <= cooldown * 1000) {
        const tLeft = moment
          .duration(timeleft)
          .format('y[ years][,] M[ Months][,] d[ days][,] h[ hours][,] m[ minutes][ and] s[ seconds]'); // format to any format

        embed.setDescription(`Please wait ${tLeft} before robbing someone again.`);

        connection.release();
        return msg.channel.send({ embeds: [embed] });
      }
    }

    let mem = await this.client.util.getMember(msg, args.join(' '));

    if (!mem) {
      // If no member is found, try to get the user by ID
      const findId = args.join(' ').toLowerCase().replace(/<@|>/g, '');
      try {
        mem = await this.client.users.fetch(findId, { force: true });
      } catch (_) {}
    }

    if (!mem) {
      connection.release();
      return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid Member');
    }
    if (mem.id === msg.author.id) {
      connection.release();
      return this.client.util.errorEmbed(msg, "You can't rob yourself.", 'Invalid Member');
    }

    const [economyRows] = await connection.execute(
      /* sql */ `
        SELECT
          *
        FROM
          economy_settings
        WHERE
          guild_id = ?
      `,
      [msg.guild.id],
    );

    const authCash = BigInt(
      (await db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`)) ||
        economyRows[0]?.start_balance ||
        0,
    );
    const authBank = BigInt((await db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.bank`)) || 0);
    const authNet = authCash + authBank;

    const memCash = BigInt(
      (await db.get(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`)) || economyRows[0]?.start_balance || 0,
    );

    if (memCash <= BigInt(0)) {
      connection.release();
      return this.client.util.errorEmbed(msg, `${mem} does not have anything to rob`, 'No Money');
    }

    const minRate = 20;
    const maxRate = 80;

    let totalAmount = Number(memCash + authNet);
    if (!Number.isFinite(totalAmount)) {
      totalAmount = Number.MAX_VALUE;
    }

    let authNetAmount = Number(authNet);
    if (!Number.isFinite(authNetAmount)) {
      authNetAmount = Number.MAX_VALUE;
    }

    const failRate = Math.floor((authNetAmount / totalAmount) * (maxRate - minRate + 1) + minRate);
    const ranNum = Math.floor(Math.random() * 100);

    // Minimum fine is 10% of the amount of money the user has, maximum fine is 30% of the amount of money the user has
    const minFine = economyRows[0]?.rob_fine_min || 10;
    const maxFine = economyRows[0]?.rob_fine_max || 30;

    // randomFine is a random number between the minimum and maximum fail rate
    const randomFine = BigInt(Math.round(Math.random() * (maxFine - minFine + 1) + minFine));

    // fineAmount is the amount of money the user will lose if they fail the robbery
    const fineAmount = this.client.util.bigIntAbs((authNet / BigInt(100)) * randomFine);

    const currencySymbol = economyRows[0]?.symbol || '$';

    if (ranNum <= failRate) {
      const newAmount = authCash - fineAmount;
      await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, newAmount.toString());

      let csFineAmount = currencySymbol + fineAmount.toLocaleString();
      csFineAmount = this.client.util.limitStringLength(csFineAmount, 0, 1024);

      embed.setDescription(`You were caught attempting to rob ${mem} and have been fined **${csFineAmount}**`);

      await msg.channel.send({ embeds: [embed] });
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
      csAmount = this.client.util.limitStringLength(csAmount, 0, 1024);
      let csAuthCash = currencySymbol + newAuthCash.toLocaleString();
      csAuthCash = this.client.util.limitStringLength(csAuthCash, 0, 1024);
      let csMemCash = currencySymbol + newMemCash.toLocaleString();
      csMemCash = this.client.util.limitStringLength(csMemCash, 0, 1024);

      embed
        .setColor(msg.settings.embedSuccessColor)
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

      await msg.channel.send({ embeds: [embed] });
    }

    await connection.execute(
      /* sql */ `
        INSERT INTO
          cooldowns (guild_id, user_id, cooldown_name, expires_at)
        VALUES
          (?, ?, ?, NOW() + INTERVAL ? SECOND) ON DUPLICATE KEY
        UPDATE expires_at =
        VALUES
          (expires_at)
      `,
      [msg.guild.id, msg.author.id, 'rob', cooldown],
    );

    connection.release();
  }
}

module.exports = Rob;
