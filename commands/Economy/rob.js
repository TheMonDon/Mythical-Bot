const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { Duration } = require('luxon');

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
    const [cooldownRows] = await this.client.db.execute(
      /* sql */ `
        SELECT
          duration
        FROM
          cooldown_settings
        WHERE
          server_id = ?
          AND cooldown_name = 'rob'
      `,
      [msg.guild.id],
    );
    const cooldown = cooldownRows[0]?.duration || 600;

    const [userCooldownRows] = await this.client.db.execute(
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
        const tLeft = Duration.fromMillis(timeleft)
          .shiftTo('years', 'months', 'days', 'hours', 'minutes', 'seconds')
          .toHuman({ maximumFractionDigits: 2, showZeros: false });

        embed.setDescription(`Please wait ${tLeft} before robbing someone again.`);

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
      return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid Member');
    }
    if (mem.id === msg.author.id) {
      return this.client.util.errorEmbed(msg, "You can't rob yourself.", 'Invalid Member');
    }

    const [economyRows] = await this.client.db.execute(
      /* sql */ `
        SELECT
          *
        FROM
          economy_settings
        WHERE
          server_id = ?
      `,
      [msg.guild.id],
    );

    // Get the user's net worth
    const [balanceRows] = await this.client.db.execute(
      /* sql */ `
        SELECT
          cash,
          bank
        FROM
          economy_balances
        WHERE
          server_id = ?
          AND user_id = ?
      `,
      [msg.guild.id, msg.member.id],
    );

    const authCash = BigInt(balanceRows[0].cash || economyRows[0]?.start_balance || 0);
    const authBank = BigInt(balanceRows[0].bank || 0);
    const authNet = authCash + authBank;

    // Get the target user's cash
    const [targetBalanceRows] = await this.client.db.execute(
      /* sql */ `
        SELECT
          cash
        FROM
          economy_balances
        WHERE
          server_id = ?
          AND user_id = ?
      `,
      [msg.guild.id, mem.id],
    );
    const memCash = BigInt(targetBalanceRows[0].cash || economyRows[0]?.start_balance || 0);

    if (memCash <= BigInt(0)) {
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
      await this.client.db.execute(
        /* sql */
        `
          INSERT INTO
            economy_balances (server_id, user_id, cash)
          VALUES
            (?, ?, ?) ON DUPLICATE KEY
          UPDATE cash =
          VALUES
            (cash)
        `,
        [msg.guild.id, msg.member.id, newAmount.toString()],
      );

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
      await this.client.db.execute(
        /* sql */
        `
          INSERT INTO
            economy_balances (server_id, user_id, cash)
          VALUES
            (?, ?, ?) ON DUPLICATE KEY
          UPDATE cash =
          VALUES
            (cash)
        `,
        [msg.guild.id, mem.id, newMemCash.toString()],
      );

      const newAuthCash = authCash + amount;
      await this.client.db.execute(
        /* sql */
        `
          INSERT INTO
            economy_balances (server_id, user_id, cash)
          VALUES
            (?, ?, ?) ON DUPLICATE KEY
          UPDATE cash =
          VALUES
            (cash)
        `,
        [msg.guild.id, msg.member.id, newAuthCash.toString()],
      );

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

    await this.client.db.execute(
      /* sql */ `
        INSERT INTO
          cooldowns (server_id, user_id, cooldown_name, expires_at)
        VALUES
          (?, ?, ?, NOW() + INTERVAL ? SECOND) ON DUPLICATE KEY
        UPDATE expires_at =
        VALUES
          (expires_at)
      `,
      [msg.guild.id, msg.author.id, 'rob', cooldown],
    );
  }
}

module.exports = Rob;
