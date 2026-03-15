const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { Duration } = require('luxon');

class Slut extends Command {
  constructor(client) {
    super(client, {
      name: 'slut',
      category: 'Economy',
      description: 'Whip it out, for some quick cash ;)',
      usage: 'slut',
      aliases: ['whore', 'escort'],
      guildOnly: true,
    });
  }

  async run(msg) {
    const [cooldownRows] = await this.client.db.execute(
      /* sql */ `
        SELECT
          duration
        FROM
          cooldown_settings
        WHERE
          server_id = ?
          AND cooldown_name = 'slut'
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
          AND cooldown_name = 'slut'
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

        embed.setDescription(`Please wait ${tLeft} to be a slut again.`);

        return msg.channel.send({ embeds: [embed] });
      }
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

    // Get the users networth
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

    const cash = BigInt(balanceRows[0].cash || economyRows[0]?.start_balance || 0);
    const bank = BigInt(balanceRows[0].bank || 0);
    const authNet = cash + bank;

    // Get the min and max fine percentages
    const minFine = economyRows[0]?.slut_fine_min || 10;
    const maxFine = economyRows[0]?.slut_fine_max || 20;

    // randomFine is a random number between the minimum and maximum fail rate
    const randomFine = BigInt(Math.abs(Math.round(Math.random() * (maxFine - minFine + 1) + minFine)));

    // fineAmount is the amount of money the user will lose if they fail the action
    const fineAmount = this.client.util.bigIntAbs((authNet / BigInt(100)) * randomFine);

    // failRate is the percentage chance of the user failing the action
    const failRate = economyRows[0]?.slut_fail_rate || 35;
    const ranNum = Math.random() * 100;
    const currencySymbol = economyRows[0]?.symbol || '$';

    if (ranNum < failRate) {
      delete require.cache[require.resolve('../../resources/messages/slut_fail.json')];
      const slutFail = require('../../resources/messages/slut_fail.json');

      let csAmount = currencySymbol + fineAmount.toLocaleString();
      csAmount = this.client.util.limitStringLength(csAmount, 0, 1024);

      const num = Math.floor(Math.random() * (slutFail.length - 1)) + 1;
      const txt = slutFail[num].replace('{amount}', csAmount);

      embed.setDescription(txt).setFooter({ text: `Reply #${num.toLocaleString()}` });

      await msg.channel.send({ embeds: [embed] });

      await this.client.db.execute(
        /* sql */
        `
          INSERT INTO
            economy_balances (server_id, user_id, cash)
          VALUES
            (?, ?, ?) ON DUPLICATE KEY
          UPDATE cash = cash -
          VALUES
            (cash)
        `,
        [msg.guild.id, msg.member.id, fineAmount.toString()],
      );
    } else {
      delete require.cache[require.resolve('../../resources/messages/slut_success.json')];
      const slutSuccess = require('../../resources/messages/slut_success.json');

      const min = economyRows[0]?.slut_min || 100;
      const max = economyRows[0]?.slut_max || 400;

      const amount = BigInt(Math.floor(Math.random() * (max - min + 1) + min));

      let csAmount = currencySymbol + amount.toLocaleString();
      csAmount = this.client.util.limitStringLength(csAmount, 0, 1024);

      const num = Math.floor(Math.random() * (slutSuccess.length - 1)) + 1;
      const txt = slutSuccess[num].replace('{amount}', csAmount);

      embed
        .setDescription(txt)
        .setColor(msg.settings.embedSuccessColor)
        .setFooter({ text: `Reply #${num.toLocaleString()}` });

      await msg.channel.send({ embeds: [embed] });

      await this.client.db.execute(
        /* sql */
        `
          INSERT INTO
            economy_balances (server_id, user_id, cash)
          VALUES
            (?, ?, ?) ON DUPLICATE KEY
          UPDATE cash = cash +
          VALUES
            (cash)
        `,
        [msg.guild.id, msg.member.id, amount.toString()],
      );
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
      [msg.guild.id, msg.author.id, 'slut', cooldown],
    );
  }
}

module.exports = Slut;
