/**
 * SMS notification helper.
 * In development (no AT_API_KEY set): logs to console.
 * In production: calls Africa's Talking API.
 * Swap this for any SMS provider — the interface is identical.
 */

async function sendSMS(phone, message) {
  if (!process.env.AT_API_KEY) {
    // Dev stub — log instead of sending
    console.log(`[SMS STUB] → ${phone}: ${message}`);
    return { status: 'stubbed' };
  }

  try {
    const AfricasTalking = require('africastalking');
    const at = AfricasTalking({ apiKey: process.env.AT_API_KEY, username: process.env.AT_USERNAME });
    const sms = at.SMS;
    await sms.send({ to: [phone], message, from: process.env.AT_SENDER_ID });
  } catch (err) {
    // Never let SMS failure crash the main flow
    console.error('[SMS ERROR]', err.message);
  }
}

/**
 * Templates — each maps to an EVT-* event in the event flow doc.
 */
const SMS = {
  memberJoined:        (chamaName)          => `Welcome to ${chamaName}! You are now an active member.`,
  memberSuspended:     ()                   => `Your FundLoop membership has been suspended. Contact your chairman.`,
  memberReinstated:    ()                   => `Your membership has been reinstated. Welcome back!`,
  invitationSent:      (chamaName, link)    => `You've been invited to join ${chamaName} on FundLoop. ${link || 'Download the app to get started.'}`,
  cycleStarted:        (num, amount, deadline, recipient) => `Cycle #${num} started. Contribute KES ${amount} by ${deadline}. This cycle's payout goes to: ${recipient}.`,
  contributionPaid:    (amount, num)        => `✓ KES ${amount} contribution received for Cycle #${num}.`,
  contributionMissed:  (num, fine)          => `You missed your contribution for Cycle #${num}. A fine of KES ${fine} has been applied.`,
  payoutReleased:      (amount)             => `🎉 KES ${amount} payout sent to your wallet!`,
  cycleComplete:       (num, next)          => `Cycle #${num} complete. Next cycle recipient: ${next}.`,
  claimSubmitted:      (name, type, amount) => `Welfare claim submitted by ${name}. Type: ${type}. Amount: KES ${amount}. Please vote to approve or reject.`,
  claimApproved:       ()                   => `Your welfare claim has been approved. Funds incoming.`,
  claimRejected:       (reason)             => `Your welfare claim was not approved. Reason: ${reason || 'N/A'}.`,
  welfareDisbursed:    (amount)             => `KES ${amount} welfare support sent to your wallet.`,
  walletTopUp:         (amount)             => `KES ${amount} deposited to your FundLoop wallet.`,
  paymentFailed:       (amount, reason)     => `Payment of KES ${amount} failed. Reason: ${reason}. Top up and try again.`,
  transactionReversed: (amount, reason)     => `A transaction of KES ${amount} has been reversed. Reason: ${reason}.`,
  ruleChanged:         (key, newVal, date)  => `Chama rule updated: ${key} is now ${newVal} starting ${date}.`,
  voteRequired:        (title)              => `Vote required: "${title}". Open FundLoop to cast your vote.`,
};

module.exports = { sendSMS, SMS };
