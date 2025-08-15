const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const moment = require('moment');
const db = new QuickDB();

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
    const connection = await this.client.db.getConnection();

    const [cooldownRows] = await connection.execute(
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

    const [userCooldownRows] = await connection.execute(
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
        const tLeft = moment
          .duration(timeleft)
          .format('y[ years][,] M[ Months][,] d[ days][,] h[ hours][,] m[ minutes][ and] s[ seconds]');
        embed.setDescription(`Please wait ${tLeft} to work again.`);

        connection.release();
        return msg.channel.send({ embeds: [embed] });
      }
    }

    const [economyRows] = await connection.execute(
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

    await connection.execute(
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

    connection.release();

    const oldBalance = BigInt(
      (await db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`)) ||
        economyRows[0]?.start_balance ||
        0,
    );

    const newBalance = oldBalance + BigInt(amount);
    await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, newBalance.toString());

    embed
      .setColor(msg.settings.embedSuccessColor)
      .setDescription(job)
      .setFooter({ text: `Reply #${num.toLocaleString()}` });

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = Work;
