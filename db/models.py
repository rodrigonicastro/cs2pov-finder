import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Index, String, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.ext.asyncio import AsyncAttrs
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.sql import func


class Base(AsyncAttrs, DeclarativeBase):
    pass


class Side(enum.Enum):
    T = "T"
    CT = "CT"

class MatchType(enum.Enum):
    FACEIT = "FACEIT"
    TOURNAMENT = "TOURNAMENT"

class ExperienceLevel(enum.Enum):
    casual = "casual"
    amateur = "amateur"
    semi_pro = "semi_pro"
    pro = "pro"
    coach = "coach"
    content_creator = "content_creator"

class MatchTypePreference(enum.Enum):
    faceit = "faceit"
    tournament = "tournament"
    both = "both"

class Notify(enum.Enum):
    yes = "yes"
    no = "no"

class ActivityType(enum.Enum):
    view_my_videos = "view_my_videos"
    view_all_videos = "view_all_videos"
    add_role = "add_role"
    delete_role = "delete_role"
    add_player = "add_player"
    delete_player = "delete_player"
    view_my_account = "view_my_account"
    view_preferences = "view_preferences"

class Map(Base):
    __tablename__ = "maps"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)

    map_roles: Mapped[list["MapRole"]] = relationship(back_populates="map", cascade="all, delete-orphan")


class MapRole(Base):
    __tablename__ = "map_roles"
    __table_args__ = (UniqueConstraint("map_id", "side", "name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    map_id: Mapped[int] = mapped_column(ForeignKey("maps.id", ondelete="CASCADE"), nullable=False)
    side: Mapped[Side] = mapped_column(Enum(Side, name="side_enum"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(100), nullable=True)

    @property
    def label(self) -> str:
        if self.display_name:
            return self.display_name
        return self.name.replace("_", " ").title()

    map: Mapped["Map"] = relationship(back_populates="map_roles")
    player_roles: Mapped[list["PlayerRole"]] = relationship(back_populates="map_role", cascade="all, delete-orphan")

class Player(Base):
    __tablename__ = "players"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    steam_id: Mapped[str | None] = mapped_column(String(20), unique=True, nullable=True)
    team: Mapped[str | None] = mapped_column(String(100))
    aliases: Mapped[list[str]] = mapped_column(ARRAY(Text), server_default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )

    player_roles: Mapped[list["PlayerRole"]] = relationship(back_populates="player", cascade="all, delete-orphan")


class Video(Base):
    __tablename__ = "videos"

    id: Mapped[int] = mapped_column(primary_key=True)
    youtube_video_id: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    player_id: Mapped[int | None] = mapped_column(ForeignKey("players.id", ondelete="SET NULL"), nullable=True)
    map_id: Mapped[int | None] = mapped_column(ForeignKey("maps.id", ondelete="SET NULL"), nullable=True)
    t_role_id: Mapped[int | None] = mapped_column(ForeignKey("map_roles.id", ondelete="SET NULL"), nullable=True)
    ct_role_id: Mapped[int | None] = mapped_column(ForeignKey("map_roles.id", ondelete="SET NULL"), nullable=True)
    match_type: Mapped[MatchType] = mapped_column(Enum(MatchType, name="match_type_enum"), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    player: Mapped["Player | None"] = relationship("Player")
    map: Mapped["Map | None"] = relationship("Map")
    t_role: Mapped["MapRole | None"] = relationship("MapRole", foreign_keys=[t_role_id])
    ct_role: Mapped["MapRole | None"] = relationship("MapRole", foreign_keys=[ct_role_id])


class Otp(Base):
    __tablename__ = "otps"
    __table_args__ = (Index("ix_otps_email", "email"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(6), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    used: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class PlayerRole(Base):
    __tablename__ = "player_roles"
    __table_args__ = (UniqueConstraint("player_id", "map_role_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id", ondelete="CASCADE"), nullable=False)
    map_role_id: Mapped[int] = mapped_column(ForeignKey("map_roles.id", ondelete="CASCADE"), nullable=False)
    last_scraped_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())

    player: Mapped["Player"] = relationship(back_populates="player_roles")
    map_role: Mapped["MapRole"] = relationship(back_populates="player_roles")



class User(Base):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("email"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    email: Mapped[str] = mapped_column(String(50), nullable=False)
    experience: Mapped[ExperienceLevel | None] = mapped_column(
        Enum(ExperienceLevel, name="experience_enum"), nullable=True
    )
    match_type_preference: Mapped[MatchTypePreference | None] = mapped_column(
        Enum(MatchTypePreference, name="match_type_preference_enum"), nullable=True
    )
    notify: Mapped[Notify | None] = mapped_column(
        Enum(Notify, name="notify_enum"), nullable=True
    )
    preferred_roles: Mapped[list[str]] = mapped_column(ARRAY(Text), server_default="{}")
    registered_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=False, server_default=text("now()"))

    user_roles: Mapped[list["UserRole"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    user_players: Mapped[list["UserPlayer"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class UserRole(Base):
    __tablename__ = "user_roles"
    __table_args__ = (UniqueConstraint("user_id", "map_role_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    map_role_id: Mapped[int] = mapped_column(ForeignKey("map_roles.id", ondelete="CASCADE"), nullable=False)

    user: Mapped["User"] = relationship(back_populates="user_roles")
    map_role: Mapped["MapRole"] = relationship()


class UserPlayer(Base):
    __tablename__ = "user_players"
    __table_args__ = (UniqueConstraint("user_id", "player_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id", ondelete="CASCADE"), nullable=False)

    user: Mapped["User"] = relationship(back_populates="user_players")
    player: Mapped["Player"] = relationship()


class UserSurvey(Base):
    __tablename__ = "user_survey"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    response: Mapped[int] = mapped_column(nullable=False)

    user: Mapped["User"] = relationship()


class UserActivity(Base):
    __tablename__ = "user_activity"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    activity_type: Mapped[ActivityType] = mapped_column(Enum(ActivityType, name="activity_type_enum"), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())