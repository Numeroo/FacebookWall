"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type Post = Pick<
  Database["public"]["Tables"]["posts"]["Row"],
  "id" | "body" | "created_at"
>;
type ConnectionStatus = "connecting" | "live" | "offline";

const characterLimit = 280;
const feedLimit = 50;

function getErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

function isPost(value: unknown): value is Post {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const post = value as Record<string, unknown>;
  return (
    (typeof post.id === "string" || typeof post.id === "number") &&
    typeof post.body === "string" &&
    typeof post.created_at === "string"
  );
}

function mergePosts(current: Post[], incoming: Post[]) {
  const postsById = new Map<string | number, Post>(
    current.map((post) => [post.id, post]),
  );

  for (const post of incoming) {
    postsById.set(post.id, post);
  }

  return [...postsById.values()]
    .sort(
      (first, second) =>
        Date.parse(second.created_at) - Date.parse(first.created_at),
    )
    .slice(0, feedLimit);
}

function formatPostDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(date));
}

function Avatar({ children, className = "" }: { children: string; className?: string }) {
  return (
    <span className={`avatar ${className}`} aria-hidden="true">
      {children}
    </span>
  );
}

export default function PostWall() {
  const [content, setContent] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let active = true;
    let channel: RealtimeChannel | null = null;
    let supabase: ReturnType<typeof getSupabaseClient> | null = null;

    async function loadPosts() {
      setIsLoading(true);
      setLoadError("");
      setConnectionError("");
      setConnectionStatus("connecting");

      try {
        supabase = getSupabaseClient();
        channel = supabase
          .channel("public-posts")
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "posts" },
            (payload) => {
              const newPost = payload.new;
              if (!active || !isPost(newPost)) {
                return;
              }

              setPosts((current) => mergePosts(current, [newPost]));
            },
          )
          .subscribe((status, error) => {
            if (!active) {
              return;
            }

            if (status === "SUBSCRIBED") {
              setConnectionStatus("live");
              setConnectionError("");
            } else if (
              status === "CHANNEL_ERROR" ||
              status === "TIMED_OUT" ||
              status === "CLOSED"
            ) {
              setConnectionStatus("offline");
              setConnectionError(
                error?.message ?? "The live connection could not be established.",
              );
            }
          });

        const { data, error } = await supabase
          .from("posts")
          .select("id, body, created_at")
          .order("created_at", { ascending: false })
          .limit(feedLimit);

        if (error) {
          throw error;
        }

        if (active) {
          setPosts((current) => mergePosts(current, data ?? []));
          setIsLoading(false);
        }
      } catch (error) {
        if (active) {
          setLoadError(`Unable to load posts: ${getErrorMessage(error)}`);
          setConnectionStatus("offline");
          setIsLoading(false);
        }
      }
    }

    void loadPosts();

    return () => {
      active = false;
      if (supabase && channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [loadAttempt]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedContent = content.trim();
    if (!trimmedContent || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const { data, error } = await getSupabaseClient()
        .from("posts")
        .insert({ body: trimmedContent })
        .select("id, body, created_at")
        .single();

      if (error) {
        throw error;
      }

      setPosts((current) => mergePosts(current, [data]));
      setContent("");
      textareaRef.current?.focus();
    } catch (error) {
      setSubmitError(`Could not share your post: ${getErrorMessage(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  const canShare = content.trim().length > 0 && !isSubmitting;

  return (
    <div className="wall-app">
      <header className="topbar">
        <div className="topbar-inner">
          <Link className="brand" href="/" aria-label="The Wall home">
            <span className="brand-mark">w</span>
            <span>the wall</span>
          </Link>
          <p className="topbar-note">A little space to catch up.</p>
          <div className="profile-chip">
            <Avatar className="avatar-small">Y</Avatar>
            <span>Your space</span>
          </div>
        </div>
      </header>

      <main className="page-shell">
        <section className="welcome">
          <div>
            <p className="eyebrow">YOUR COMMUNITY, IN ONE PLACE</p>
            <h1>What&apos;s on your mind?</h1>
            <p className="welcome-copy">
              Share a moment, a thought, or just say hello.
            </p>
          </div>
          <div className="welcome-art" aria-hidden="true">
            <span className="art-dot art-dot-one" />
            <span className="art-dot art-dot-two" />
            <span className="art-sparkle">✳</span>
          </div>
        </section>

        <section className="feed-column" aria-label="Your wall">
          <form className="card composer" onSubmit={handleSubmit}>
            <div className="composer-top">
              <Avatar className="avatar-you">Y</Avatar>
              <label className="composer-label" htmlFor="post-content">
                Share a thought
              </label>
            </div>
            <textarea
              ref={textareaRef}
              id="post-content"
              className="post-input"
              placeholder="What would you like to share?"
              value={content}
              onChange={(event) => {
                setContent(event.target.value);
                setSubmitError("");
              }}
              maxLength={characterLimit}
              rows={3}
              aria-describedby="character-count"
            />
            {submitError && (
              <p className="inline-error" role="alert">
                {submitError}
              </p>
            )}
            <div className="composer-actions">
              <span
                id="character-count"
                className="character-count"
                aria-live="polite"
              >
                {content.length} / {characterLimit}
              </span>
              <button className="share-button" type="submit" disabled={!canShare}>
                {isSubmitting ? "Sharing..." : "Share"}
                {!isSubmitting && (
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    className="share-icon"
                  >
                    <path d="M3.5 10h12m-5-5 5 5-5 5" />
                  </svg>
                )}
              </button>
            </div>
          </form>

          <div className="feed-heading">
            <div>
              <p className="eyebrow">THE LATEST</p>
              <h2>Your feed</h2>
            </div>
            <span
              className={`live-status live-status-${connectionStatus}`}
              role="status"
            >
              <span className="live-indicator" />
              {connectionStatus === "live"
                ? "Live updates"
                : connectionStatus === "connecting"
                  ? "Connecting"
                  : "Offline"}
            </span>
          </div>

          {connectionError && (
            <p className="connection-message" role="status">
              Live updates are unavailable: {connectionError}
            </p>
          )}

          {loadError ? (
            <div className="card feed-message feed-error" role="alert">
              <p>{loadError}</p>
              <button
                className="retry-button"
                type="button"
                onClick={() => setLoadAttempt((attempt) => attempt + 1)}
              >
                Try again
              </button>
            </div>
          ) : isLoading ? (
            <div className="card feed-message" role="status">
              <span className="loading-spinner" aria-hidden="true" />
              <p>Loading your feed...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="card feed-message empty-feed">
              <span className="empty-icon" aria-hidden="true">
                ✳
              </span>
              <h3>Your wall is waiting</h3>
              <p>Be the first to share something with your community.</p>
            </div>
          ) : (
            <div className="posts-list">
              {posts.map((post) => (
                <article className="card post-card" key={post.id}>
                  <div className="post-header">
                    <Avatar className="avatar-post">W</Avatar>
                    <div className="post-byline">
                      <p className="post-author">Wall member</p>
                      <time
                        className="post-time"
                        dateTime={post.created_at}
                        title={new Date(post.created_at).toISOString()}
                      >
                        {formatPostDate(post.created_at)}
                      </time>
                    </div>
                    <span className="post-menu" aria-hidden="true">
                      ···
                    </span>
                  </div>
                  <p className="post-content">{post.body}</p>
                  <div className="post-footer">
                    <span className="post-footer-dot" />
                    Shared with the community
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="page-footer">
          <span className="footer-mark">w</span>
          <span>A good place to stay in the loop.</span>
        </footer>
      </main>
    </div>
  );
}
