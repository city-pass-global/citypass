#![no_std]
use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, Address, BytesN, Env,
};

#[contracttype]
#[derive(Clone)]
enum Key {
    Issuer,
    Paused,
    Activity(Address),
    Event(BytesN<32>),
    Pass(Address, BytesN<32>),
    Stamp(Address, BytesN<32>),
    Redemption(BytesN<32>),
    Service(Address, BytesN<32>),
    Exploration(Address, BytesN<32>),
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Activity {
    pub reputation: u64,
    pub purchases: u32,
    pub stamps: u32,
    pub redemptions: u32,
    pub exploration_stamps: u32,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Record {
    pub user: Address,
    pub destination: BytesN<32>,
    pub subject: BytesN<32>,
    pub kind: u32,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    Inactive = 1,
    Conflict = 2,
    InvalidKind = 3,
    Paused = 4,
    Overflow = 5,
    AlreadyCollected = 6,
}

#[contractevent]
pub struct Recorded {
    #[topic]
    pub user: Address,
    pub event_id: BytesN<32>,
    pub kind: u32,
    pub reputation: u64,
}

fn keep(env: &Env, key: &Key) {
    // Persistent keys archive rather than disappear: restore before invoking again.
    env.storage().persistent().extend_ttl(key, 100_000, 500_000);
    env.storage().instance().extend_ttl(100_000, 500_000);
}

#[contract]
pub struct PassportActivity;
#[contractimpl]
impl PassportActivity {
    pub fn __constructor(env: Env, issuer: Address) {
        env.storage().instance().set(&Key::Issuer, &issuer);
        env.storage().instance().set(&Key::Paused, &false);
    }
    pub fn issuer(env: Env) -> Address {
        env.storage().instance().get(&Key::Issuer).unwrap()
    }
    // Inspect accepted evidence before retrying a delivery after a lost response.
    pub fn event(env: Env, event_id: BytesN<32>) -> Option<Record> {
        env.storage().persistent().get(&Key::Event(event_id))
    }
    pub fn set_issuer(env: Env, issuer: Address) {
        Self::issuer(env.clone()).require_auth();
        env.storage().instance().set(&Key::Issuer, &issuer);
        env.storage().instance().extend_ttl(100_000, 500_000);
    }
    // Passport creation is sponsored by the trusted issuer after verified Pollar login.
    pub fn register(env: Env, user: Address) {
        Self::issuer(env.clone()).require_auth();
        let key = Key::Activity(user);
        if !env.storage().persistent().has(&key) {
            env.storage().persistent().set(
                &key,
                &Activity {
                    reputation: 0,
                    purchases: 0,
                    stamps: 0,
                    redemptions: 0,
                    exploration_stamps: 0,
                },
            );
        }
        keep(&env, &key);
    }
    pub fn set_paused(env: Env, paused: bool) {
        let issuer: Address = env.storage().instance().get(&Key::Issuer).unwrap();
        issuer.require_auth();
        env.storage().instance().set(&Key::Paused, &paused);
        env.storage().instance().extend_ttl(100_000, 500_000);
    }
    // Trusted issuer attests independently verified application events.
    // kind: 1 settled purchase, 2 validated QR stamp, 3 completed funded redemption.
    // kind: 4 first settled service acquisition (+80 and one stamp), 5 self-reported exploration (stamp only).
    // No client-provided point amounts. No personal data or raw QR credentials.
    pub fn record(env: Env, event_id: BytesN<32>, record: Record) -> Result<Activity, Error> {
        let issuer: Address = env.storage().instance().get(&Key::Issuer).unwrap();
        issuer.require_auth();
        if env.storage().instance().get(&Key::Paused).unwrap_or(false) {
            return Err(Error::Paused);
        }
        let key = Key::Activity(record.user.clone());
        let mut activity: Activity = env.storage().persistent().get(&key).unwrap_or(Activity {
            reputation: 0,
            purchases: 0,
            stamps: 0,
            redemptions: 0,
            exploration_stamps: 0,
        });
        let event_key = Key::Event(event_id.clone());
        if let Some(prior) = env.storage().persistent().get::<_, Record>(&event_key) {
            if prior != record {
                return Err(Error::Conflict);
            }
            keep(&env, &event_key);
            keep(&env, &key);
            return Ok(activity);
        }
        let collection = match record.kind {
            1 => {
                activity.reputation = activity.reputation.checked_add(80).ok_or(Error::Overflow)?;
                activity.purchases = activity.purchases.checked_add(1).ok_or(Error::Overflow)?;
                Some(Key::Pass(record.user.clone(), record.destination.clone()))
            }
            2 => {
                activity.stamps = activity.stamps.checked_add(1).ok_or(Error::Overflow)?;
                Some(Key::Stamp(record.user.clone(), record.subject.clone()))
            }
            3 => {
                activity.redemptions =
                    activity.redemptions.checked_add(1).ok_or(Error::Overflow)?;
                Some(Key::Redemption(record.subject.clone()))
            }
            4 => {
                activity.reputation = activity.reputation.checked_add(80).ok_or(Error::Overflow)?;
                activity.purchases = activity.purchases.checked_add(1).ok_or(Error::Overflow)?;
                activity.stamps = activity.stamps.checked_add(1).ok_or(Error::Overflow)?;
                Some(Key::Service(record.user.clone(), record.subject.clone()))
            }
            5 => {
                activity.stamps = activity.stamps.checked_add(1).ok_or(Error::Overflow)?;
                activity.exploration_stamps = activity
                    .exploration_stamps
                    .checked_add(1)
                    .ok_or(Error::Overflow)?;
                Some(Key::Exploration(
                    record.user.clone(),
                    record.subject.clone(),
                ))
            }
            _ => return Err(Error::InvalidKind),
        };
        if let Some(collection_key) = collection {
            if env.storage().persistent().has(&collection_key) {
                return Err(Error::AlreadyCollected);
            }
            env.storage().persistent().set(&collection_key, &true);
            keep(&env, &collection_key);
        }
        env.storage().persistent().set(&event_key, &record);
        env.storage().persistent().set(&key, &activity);
        keep(&env, &event_key);
        keep(&env, &key);
        Recorded {
            user: record.user,
            event_id,
            kind: record.kind,
            reputation: activity.reputation,
        }
        .publish(&env);
        Ok(activity)
    }
    pub fn activity(env: Env, user: Address) -> Option<Activity> {
        env.storage().persistent().get(&Key::Activity(user))
    }
    pub fn tier(env: Env, user: Address) -> Result<u32, Error> {
        let a = Self::activity(env, user).ok_or(Error::Inactive)?;
        Ok(if a.reputation >= 240 {
            2
        } else if a.reputation >= 80 {
            1
        } else {
            0
        })
    }
}
#[cfg(test)]
mod test;
