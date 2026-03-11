const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { Duration } = require('luxon');

class Work extends Command {
  constructor(client) {
    super(client, {
      name: 'work',
      category: 'Economy',
      description: 'Work for some extra money',
      usage: 'work',
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
          AND cooldown_name = 'work'
      `,
      [msg.guild.id],
    );
    const cooldown = cooldownRows[0]?.duration || 300;

    const [userCooldownRows] = await this.client.db.execute(
      /* sql */ `
        SELECT
          *
        FROM
          cooldowns
        WHERE
          user_id = ?
          AND cooldown_name = 'work'
          AND expires_at > NOW()
      `,
      [msg.author.id],
    );
    const expiresAt = userCooldownRows[0]?.expires_at;

    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedErrorColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() });

    if (expiresAt) {
      const timeleft = new Date(expiresAt) - Date.now();
      if (timeleft > 0 && timeleft <= cooldown * 1000) {
        const timeLeftDuration = Duration.fromMillis(timeleft).shiftTo(
          'years',
          'months',
          'days',
          'hours',
          'minutes',
          'seconds',
        );
        const roundedTimeLeftDuration = timeLeftDuration.set({ seconds: Math.floor(timeLeftDuration.seconds) });
        const tLeft = roundedTimeLeftDuration.toHuman({ showZeros: false });

        embed.setDescription(`Please wait ${tLeft} to work again.`);

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

    const min = economyRows[0]?.work_min || 20;
    const max = economyRows[0]?.work_max || 250;

    const currencySymbol = economyRows[0]?.symbol || '$';
    const amount = Math.abs(Math.floor(Math.random() * (max - min + 1) + min));
    const csamount = currencySymbol + amount.toLocaleString();

    delete require.cache[require.resolve('../../resources/messages/work_jobs.json')];
    const jobs = require('../../resources/messages/work_jobs.json');

    const num = Math.floor(Math.random() * (jobs.length - 1)) + 1;
    const job = jobs[num].replace('{amount}', csamount);

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
      [msg.guild.id, msg.author.id, 'work', cooldown],
    );

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

    embed
      .setColor(msg.settings.embedSuccessColor)
      .setDescription(job)
      .setFooter({ text: `Reply #${num.toLocaleString()}` });

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = Work;
